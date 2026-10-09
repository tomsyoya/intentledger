import test from "node:test";
import assert from "node:assert/strict";
import { scenarios, fixtureProvider } from "../src/fixtures.ts";
import {
  classify,
  demoReducer,
  initialDemoState,
  DEMO_STEPS,
} from "../src/domain.ts";

test("classification_bridge_correlates_both_chains", () => {
  const record = classify(scenarios[0]);
  assert.equal(record.action, "BRIDGE");
  assert.equal(record.requestedAmount, "1000");
  assert.equal(record.receivedAmount, "998.4");
  assert.equal(record.transactions.length, 2);
  assert.equal(record.confidence, "HIGH");
  assert.equal(record.status, "SUCCESS");
  assert.equal(record.evidence.length, 4);
});
test("classification_rejects_mismatched_wallet_request", () => {
  const scenario = structuredClone(scenarios[0]);
  scenario.walletRequest.intentId = "unrelated";
  assert.throws(() => classify(scenario), /correlation/);
});
test("classification_failed_execution_never_reports_success", () => {
  const scenario = structuredClone(scenarios[0]);
  scenario.transactions[1].status = "failed";
  const record = classify(scenario);
  assert.equal(record.status, "FAILED");
  assert.notEqual(record.confidence, "HIGH");
});
test("fixtures_four_actions_have_seven_transactions_four_protocols", async () => {
  assert.equal(scenarios.length, 4);
  assert.equal(scenarios.flatMap((s) => s.transactions).length, 7);
  assert.equal(new Set(scenarios.map((s) => s.intent.protocol)).size, 4);
  assert.equal(
    new Set(scenarios.flatMap((s) => s.transactions.map((t) => t.chain))).size,
    2,
  );
  assert.deepEqual(await fixtureProvider.getScenarios(), scenarios);
  for (const scenario of scenarios)
    assert.equal(classify(scenario).confidence, "HIGH");
});
test("demo_sequence_lasts_fifty_two_seconds", () => {
  assert.equal(
    DEMO_STEPS.reduce((sum, step) => sum + step.duration, 0),
    52000,
  );
});
test("demo_pause_next_restart_are_replayable", () => {
  for (let cycle = 0; cycle < 3; cycle++) {
    let state = demoReducer(initialDemoState, { type: "PLAY" });
    state = demoReducer(state, { type: "PAUSE" });
    assert.equal(state.playing, false);
    state = demoReducer(state, { type: "NEXT" });
    assert.equal(state.step, 1);
    assert.equal(state.playing, false);
    state = demoReducer(state, { type: "PLAY" });
    for (let i = 0; i < DEMO_STEPS.length; i++)
      state = demoReducer(state, { type: "NEXT" });
    assert.equal(state.step, DEMO_STEPS.length - 1);
    assert.equal(state.playing, false);
    assert.equal(state.completed, true);
    state = demoReducer(state, { type: "RESTART" });
    assert.deepEqual(state, initialDemoState);
  }
});

test('fixtures_solana_wallets_and_signatures_have_valid_base58_lengths', () => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function decodedByteLength(value: string) {
    let integer = 0n;
    for (const char of value) {
      const index = alphabet.indexOf(char);
      assert.ok(index >= 0, `Invalid base58 character: ${char}`);
      integer = integer * 58n + BigInt(index);
    }
    const leadingZeroes = value.match(/^1*/)?.[0].length ?? 0;
    return (integer === 0n ? 0 : Math.ceil(integer.toString(2).length / 8)) + leadingZeroes;
  }
  for (const scenario of scenarios) {
    if (scenario.sourceChain === 'solana') assert.equal(decodedByteLength(scenario.intent.wallet), 32);
    for (const tx of scenario.transactions) {
      if (tx.chain === 'solana') assert.equal(decodedByteLength(tx.hash), 64, tx.id);
      else assert.match(tx.hash, /^0x[a-f0-9]{64}$/);
    }
  }
});
