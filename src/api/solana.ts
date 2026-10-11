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
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function integerString(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}
function timestamp(value: unknown) {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= 8640000000000)
  );
}
function balance(value: unknown): value is LiveBalance {
  return (
    object(value) &&
    typeof value.address === "string" &&
    integerString(value.lamports) &&
    integerString(value.slot) &&
    typeof value.sol === "string" &&
    /^\d+(\.\d{1,9})?$/.test(value.sol)
  );
}
function signatures(value: unknown): value is LiveSignature[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        object(row) &&
        typeof row.signature === "string" &&
        integerString(row.slot) &&
        "err" in row &&
        (row.memo === null || typeof row.memo === "string") &&
        timestamp(row.blockTime) &&
        (row.confirmationStatus === null ||
          row.confirmationStatus === "confirmed" ||
          row.confirmationStatus === "finalized"),
    )
  );
}
function transaction(value: unknown): value is LiveTransaction {
  return (
    object(value) &&
    typeof value.signature === "string" &&
    integerString(value.slot) &&
    timestamp(value.blockTime) &&
    ["confirmed", "failed", "unknown"].includes(String(value.status)) &&
    (value.feeLamports === null || integerString(value.feeLamports)) &&
    (value.version === "legacy" ||
      value.version === 0 ||
      value.version === 1) &&
    typeof value.rawJSON === "string"
  );
}
/** The Go service is the sole network boundary; fixture accounting never uses this adapter. */
export function createSolanaAPI(
  baseURL: string,
  fetcher: typeof fetch = globalThis.fetch,
) {
  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    throw new Error("Use an absolute HTTP(S) API server URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Use an HTTP(S) API server URL without credentials or query parameters.",
    );
  const root = url.href.replace(/\/+$/, "");
  async function get<T>(
    path: string,
    validate: (value: unknown) => value is T,
    signal?: AbortSignal,
  ): Promise<APIResult<T>> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    const timeout = globalThis.setTimeout(abort, 12000);
    try {
      if (controller.signal.aborted)
        throw new DOMException("Request cancelled", "AbortError");
      const response = await fetcher(`${root}/api/v1/${path}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch (failure) {
        if (controller.signal.aborted) throw failure;
        throw new APIError(
          response.status || 502,
          "INVALID_RESPONSE",
          "The Go API did not return JSON. Check the API server URL.",
        );
      }
      if (!response.ok) {
        const detail =
          object(payload) && object(payload.error) ? payload.error : {};
        throw new APIError(
          response.status,
          typeof detail.code === "string" ? detail.code : "API_ERROR",
          typeof detail.message === "string"
            ? detail.message
            : `Go API request failed (${response.status}).`,
        );
      }
      if (
        !object(payload) ||
        (payload.cluster !== "devnet" &&
          payload.cluster !== "localnet" &&
          payload.cluster !== "testnet") ||
        payload.commitment !== "confirmed" ||
        !validate(payload.data)
      )
        throw new APIError(
          502,
          "INVALID_RESPONSE",
          "The Go API returned an invalid response.",
        );
      return {
        data: payload.data,
        cluster: payload.cluster,
        commitment: payload.commitment,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      if (controller.signal.aborted) {
        if (signal?.aborted)
          throw new DOMException("Request cancelled", "AbortError");
        throw new APIError(
          504,
          "API_TIMEOUT",
          "The Go API request timed out. Please try again.",
        );
      }
      throw new APIError(
        0,
        "API_UNREACHABLE",
        "Could not reach the Go API. Start the backend or check the API server URL and allowed origins.",
      );
    } finally {
      globalThis.clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  return {
    health: (signal?: AbortSignal) =>
      get(
        "health",
        (value): value is { status: "ok" } =>
          object(value) && value.status === "ok",
        signal,
      ),
    balance: (address: string, signal?: AbortSignal) =>
      get(
        `solana/balance?address=${encodeURIComponent(address)}`,
        balance,
        signal,
      ),
    signatures: (address: string, signal?: AbortSignal) =>
      get(
        `solana/signatures?address=${encodeURIComponent(address)}&limit=10`,
        signatures,
        signal,
      ),
    transaction: (signature: string, signal?: AbortSignal) =>
      get(
        `solana/transactions/${encodeURIComponent(signature)}`,
        transaction,
        signal,
      ),
  };
}
