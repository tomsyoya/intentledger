export interface APIResult<T> {
  data: T;
  cluster: "devnet" | "localnet" | "testnet";
  commitment: "confirmed";
}
export interface LiveBalance {
  address: string;
  lamports: string;
  sol: string;
  slot: string;
}
export interface LiveSignature {
  signature: string;
  slot: string;
  err: unknown;
  memo: string | null;
  blockTime: number | null;
  confirmationStatus: "confirmed" | "finalized" | null;
}
export interface LiveTransaction {
  signature: string;
  slot: string;
  blockTime: number | null;
  status: "confirmed" | "failed" | "unknown";
  feeLamports: string | null;
  version: "legacy" | 0 | 1;
  rawJSON: string;
}
export class APIError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.code = code;
  }
}
export type Cluster = APIResult<unknown>["cluster"];
export const RPC_ENDPOINTS: Record<Cluster, string> = {
  localnet: "http://127.0.0.1:8899",
  testnet: "https://api.testnet.solana.com",
  devnet: "https://api.devnet.solana.com",
};
function object(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function invalid(): never {
  throw new APIError(
    502,
    "INVALID_RESPONSE",
    "Solana RPC returned an invalid response.",
  );
}
function integer(v: unknown): string {
  if (typeof v === "number" && Number.isSafeInteger(v) && v >= 0)
    return String(v);
  if (
    typeof v === "string" &&
    /^\d+$/.test(v) &&
    BigInt(v) <= 18446744073709551615n
  )
    return v;
  return invalid();
}
function blockTime(v: unknown): number | null {
  if (v === null) return null;
  if (
    typeof v === "number" &&
    Number.isSafeInteger(v) &&
    v >= 0 &&
    v <= 8640000000000
  )
    return v;
  return invalid();
}
function publicKey(value: string, bytes: number) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  if (!value || value.length > 88) return false;
  let n = 0n;
  for (const c of value) {
    const digit = alphabet.indexOf(c);
    if (digit < 0) return false;
    n = n * 58n + BigInt(digit);
  }
  let size = 0;
  while (n > 0n) {
    size++;
    n >>= 8n;
  }
  return size + (value.match(/^1*/)?.[0].length ?? 0) === bytes;
}
// Tokenize strings together with numbers, so digits inside strings are never rewritten.
function parseExact(text: string): unknown {
  return JSON.parse(
    text.replace(
      /"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
      (token) =>
        /^-?\d+$/.test(token) && !Number.isSafeInteger(Number(token))
          ? JSON.stringify(token)
          : token,
    ),
  );
}
/** Read-only browser JSON-RPC boundary; fixture accounting is independent. */
export function createSolanaAPI(
  endpoint: string,
  fetcher: typeof fetch = globalThis.fetch,
  cluster: Cluster = "testnet",
) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Use an absolute HTTP(S) RPC URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error("Use an HTTP(S) RPC URL without credentials or fragments.");
  let nextId = 0;
  async function call(method: string, params: unknown[], signal?: AbortSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 12000);
    const id = ++nextId;
    try {
      if (controller.signal.aborted)
        throw new DOMException("Cancelled", "AbortError");
      const response = await fetcher(url.href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new APIError(
          response.status,
          "RPC_HTTP_ERROR",
          `RPC HTTP error (${response.status}). Check the endpoint or retry later.`,
        );
      const raw = await response.text();
      let payload: unknown;
      try {
        payload = parseExact(raw);
      } catch {
        return invalid();
      }
      if (!object(payload) || payload.jsonrpc !== "2.0" || payload.id !== id)
        return invalid();
      if (object(payload.error))
        throw new APIError(
          502,
          "RPC_ERROR",
          `RPC error (${String(payload.error.code)}). Check the cluster, input or provider limits.`,
        );
      if (!("result" in payload)) return invalid();
      return { result: payload.result, raw };
    } catch (error) {
      if (error instanceof APIError) throw error;
      if (controller.signal.aborted) {
        if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
        throw new APIError(
          504,
          "RPC_TIMEOUT",
          "Solana RPC request timed out. Please retry.",
        );
      }
      throw new APIError(
        0,
        "RPC_UNREACHABLE",
        "Could not reach Solana RPC. Check the endpoint, network, CORS and browser mixed-content restrictions.",
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  const wrap = <T>(data: T): APIResult<T> => ({
    data,
    cluster,
    commitment: "confirmed",
  });
  const validate = (value: string, bytes: number) => {
    if (!publicKey(value, bytes))
      throw new APIError(
        400,
        "INVALID_INPUT",
        `Invalid Solana ${bytes === 32 ? "address" : "signature"}.`,
      );
  };
  return {
    health: async (signal?: AbortSignal) => {
      const { result } = await call("getHealth", [], signal);
      if (result !== "ok") return invalid();
      return wrap({ status: "ok" as const });
    },
    balance: async (
      address: string,
      signal?: AbortSignal,
    ): Promise<APIResult<LiveBalance>> => {
      validate(address, 32);
      const { result } = await call(
        "getBalance",
        [address, { commitment: "confirmed" }],
        signal,
      );
      if (!object(result) || !object(result.context)) return invalid();
      const lamports = integer(result.value);
      const n = BigInt(lamports);
      const fraction = (n % 1000000000n)
        .toString()
        .padStart(9, "0")
        .replace(/0+$/, "");
      return wrap({
        address,
        lamports,
        sol: `${n / 1000000000n}${fraction ? "." + fraction : ""}`,
        slot: integer(result.context.slot),
      });
    },
    signatures: async (
      address: string,
      signal?: AbortSignal,
    ): Promise<APIResult<LiveSignature[]>> => {
      validate(address, 32);
      const { result } = await call(
        "getSignaturesForAddress",
        [address, { limit: 10, commitment: "confirmed" }],
        signal,
      );
      if (!Array.isArray(result)) return invalid();
      return wrap(
        result.map((row) => {
          if (
            !object(row) ||
            typeof row.signature !== "string" ||
            !publicKey(row.signature, 64) ||
            !("err" in row) ||
            (row.memo !== null && typeof row.memo !== "string") ||
            ![null, "confirmed", "finalized"].includes(
              row.confirmationStatus as string | null,
            )
          )
            return invalid();
          return {
            signature: row.signature,
            slot: integer(row.slot),
            err: row.err,
            memo: row.memo as string | null,
            blockTime: blockTime(row.blockTime),
            confirmationStatus:
              row.confirmationStatus as LiveSignature["confirmationStatus"],
          };
        }),
      );
    },
    transaction: async (
      signature: string,
      signal?: AbortSignal,
    ): Promise<APIResult<LiveTransaction>> => {
      validate(signature, 64);
      const { result, raw } = await call(
        "getTransaction",
        [
          signature,
          {
            encoding: "jsonParsed",
            commitment: "confirmed",
            maxSupportedTransactionVersion: 1,
          },
        ],
        signal,
      );
      if (result === null)
        throw new APIError(
          404,
          "TRANSACTION_NOT_FOUND",
          "Transaction not found on this cluster. It may be pending or outside retained history.",
        );
      if (
        !object(result) ||
        !["legacy", 0, 1].includes(result.version as string | number) ||
        (result.meta !== null && !object(result.meta))
      )
        return invalid();
      const meta = result.meta;
      if (object(meta) && !("err" in meta)) return invalid();
      return wrap({
        signature,
        slot: integer(result.slot),
        blockTime: blockTime(result.blockTime),
        version: result.version as LiveTransaction["version"],
        status:
          meta === null
            ? "unknown"
            : object(meta) && meta.err === null
              ? "confirmed"
              : "failed",
        feeLamports: object(meta) ? integer(meta.fee) : null,
        rawJSON: raw,
      });
    },
  };
}
