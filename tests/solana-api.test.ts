import test from "node:test";
import assert from "node:assert/strict";
import { createSolanaAPI } from "../src/api/solana.ts";
const address = "11111111111111111111111111111111";
const envelope = (data: unknown) => ({
  data,
  cluster: "devnet",
  commitment: "confirmed",
});
test("solana_api_balance_preserves_strings_and_uses_go_endpoint", async () => {
  let requested = "";
  const api = createSolanaAPI("http://localhost:8080/", async (input, init) => {
    requested = String(input);
    assert.equal(init?.method, "GET");
    assert.ok(init?.signal);
    return Response.json(
      envelope({
        address,
        lamports: "18446744073709551615",
        sol: "18446744073.709551615",
        slot: "9007199254740993",
      }),
    );
  });
  const result = await api.balance(address);
  assert.equal(
    requested,
    `http://localhost:8080/api/v1/solana/balance?address=${address}`,
  );
  assert.equal(result.data.lamports, "18446744073709551615");
  assert.equal(result.cluster, "devnet");
});
test("solana_api_errors_keep_http_status_and_api_code", async () => {
  const api = createSolanaAPI("https://api.example.test", async () =>
    Response.json(
      {
        error: {
          code: "TRANSACTION_NOT_FOUND",
          message: "Transaction not found on this cluster.",
        },
      },
      { status: 404 },
    ),
  );
  await assert.rejects(
    api.transaction("1".repeat(64)),
    (error: unknown) =>
      error instanceof Error &&
      "status" in error &&
      error.status === 404 &&
      "code" in error &&
      error.code === "TRANSACTION_NOT_FOUND",
  );
});
test("solana_api_rejects_invalid_base_and_malformed_success_data", async () => {
  assert.throws(() => createSolanaAPI("file:///tmp/rpc"), /HTTP/);
  const api = createSolanaAPI("https://api.example.test", async () =>
    Response.json(
      envelope({ address, lamports: 9007199254740992, sol: "1", slot: "1" }),
    ),
  );
  await assert.rejects(api.balance(address), /invalid response/i);
});
test("solana_api_network_failure_is_actionable_without_fixture_fallback", async () => {
  const api = createSolanaAPI("http://localhost:8080", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(api.balance(address), /Go API/);
});
test("solana_api_signatures_and_transaction_preserve_raw_json", async () => {
  const sig = "1".repeat(64);
  const rawJSON = '{"slot":9007199254740993}';
  const api = createSolanaAPI(
    "https://api.example.test/service",
    async (input) =>
      String(input).includes("/signatures?")
        ? Response.json(envelope([]))
        : Response.json(
            envelope({
              signature: sig,
              slot: "9007199254740993",
              blockTime: null,
              status: "unknown",
              feeLamports: null,
              version: "legacy",
              rawJSON,
            }),
          ),
  );
  assert.deepEqual((await api.signatures(address)).data, []);
  assert.equal((await api.transaction(sig)).data.rawJSON, rawJSON);
});

test('solana_api_rejects_unsafe_block_time_before_rendering', async () => {
  const api = createSolanaAPI('http://localhost:8080', async () => Response.json(envelope([{ signature: '1'.repeat(64), slot: '1', err: null, memo: null, blockTime: 9007199254740000, confirmationStatus: 'confirmed' }])));
  await assert.rejects(api.signatures(address), /invalid response/i);
});
