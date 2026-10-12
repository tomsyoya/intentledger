import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CircleAlert,
  Code2,
  Link2,
  Search,
  Server,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { APIError, createSolanaAPI, RPC_ENDPOINTS } from "../api/solana.ts";
import type {
  APIResult,
  Cluster,
  LiveBalance,
  LiveSignature,
  LiveTransaction,
} from "../api/solana.ts";
import { Badge, Detail, PanelTitle, TxHash } from "../components/ui.tsx";

export function SolanaRPC() {
  const initialCluster: Cluster = ["localhost", "127.0.0.1", "[::1]"].includes(
    window.location.hostname,
  )
    ? "localnet"
    : "testnet";
  const [cluster, setCluster] = useState<Cluster>(initialCluster);
  const [baseURL, setBaseURL] = useState(RPC_ENDPOINTS[initialCluster]);
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [account, setAccount] = useState<{
    balance: APIResult<LiveBalance>;
    signatures: LiveSignature[];
  } | null>(null);
  const [transaction, setTransaction] =
    useState<APIResult<LiveTransaction> | null>(null);
  const [connection, setConnection] = useState<string | null>(null);
  const [loading, setLoading] = useState<
    "health" | "account" | "transaction" | null
  >(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [],
  );
  const cancel = () => {
    generation.current++;
    controller.current?.abort();
    setLoading(null);
    setError("");
  };
  async function request(
    kind: "health" | "account" | "transaction",
    run: (
      api: ReturnType<typeof createSolanaAPI>,
      signal: AbortSignal,
    ) => Promise<() => void>,
  ) {
    cancel();
    const current = generation.current;
    const pending = new AbortController();
    controller.current = pending;
    setLoading(kind);
    try {
      const apply = await run(
        createSolanaAPI(baseURL.trim(), globalThis.fetch, cluster),
        pending.signal,
      );
      if (generation.current === current) apply();
    } catch (failure) {
      if (generation.current === current)
        setError(
          failure instanceof APIError
            ? `${failure.message} (${failure.code})`
            : failure instanceof Error
              ? failure.message
              : "Request failed.",
        );
    } finally {
      if (generation.current === current) setLoading(null);
    }
  }
  const lookup = () => {
    setAccount(null);
    setTransaction(null);
    void request("account", async (api, signal) => {
      const [balance, history] = await Promise.all([
        api.balance(address.trim(), signal),
        api.signatures(address.trim(), signal),
      ]);
      if (balance.cluster !== history.cluster)
        throw new Error(
          "The API returned inconsistent network labels. Please retry.",
        );
      return () => {
        setAccount({ balance, signatures: history.data });
        setConnection(balance.cluster);
      };
    });
  };
  const inspect = (value: string) => {
    setSignature(value);
    setTransaction(null);
    void request("transaction", async (api, signal) => {
      const result = await api.transaction(value.trim(), signal);
      return () => {
        setTransaction(result);
        setConnection(result.cluster);
      };
    });
  };
  return (
    <div className="rpc-workspace">
      <div className="rpc-intro">
        <ShieldCheck size={20} />
        <div>
          <strong>Read-only Solana access</strong>
          <p>
            Query Solana directly from your browser. Live reads do not create
            semantic records or change fixture accounting.
          </p>
        </div>
        <Badge tone="purple">No backend required</Badge>
      </div>
      <section className="panel rpc-connection">
        <PanelTitle
          icon={Server}
          title="Connect to Solana RPC"
          right={
            connection ? (
              <Badge tone="green">RPC reachable · {connection}</Badge>
            ) : (
              <Badge>Not checked</Badge>
            )
          }
        />
        <div className="rpc-connection-body">
          <div className="rpc-field">
            <label htmlFor="rpc-cluster">Network</label>
            <select
              id="rpc-cluster"
              value={cluster}
              onChange={(event) => {
                cancel();
                const next = event.currentTarget.value as Cluster;
                setCluster(next);
                setBaseURL(RPC_ENDPOINTS[next]);
                setAccount(null);
                setTransaction(null);
                setConnection(null);
              }}
            >
              <option value="localnet">Localnet</option>
              <option value="testnet">Testnet</option>
              <option value="devnet">Devnet</option>
            </select>
          </div>
          <div className="rpc-field">
            <label htmlFor="rpc-base-url">RPC endpoint URL</label>
            <input
              id="rpc-base-url"
              type="url"
              value={baseURL}
              maxLength={2048}
              spellCheck={false}
              onInput={(event) => {
                cancel();
                setBaseURL(event.currentTarget.value);
                setAccount(null);
                setTransaction(null);
                setConnection(null);
              }}
            />
            <small>
              Browser requests require RPC CORS support. Use HTTPS on published
              sites. Custom URLs must match the selected network; never enter
              secret API keys.
            </small>
          </div>
          <button
            className="button secondary"
            disabled={loading !== null || !baseURL.trim()}
            onClick={() => {
              void request("health", async (api, signal) => {
                const result = await api.health(signal);
                return () => setConnection(result.cluster);
              });
            }}
          >
            <Link2 size={15} />
            {loading === "health" ? "Checking…" : "Check RPC"}
          </button>
        </div>
      </section>
      <div className="rpc-forms">
        <section className="panel">
          <PanelTitle
            icon={Wallet}
            title="Account balance & recent transactions"
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              lookup();
            }}
          >
            <div className="rpc-field">
              <label htmlFor="rpc-address">Public account address</label>
              <input
                id="rpc-address"
                value={address}
                maxLength={88}
                placeholder="Paste an address on the configured cluster"
                spellCheck={false}
                autoComplete="off"
                required
                onInput={(event) => {
                  cancel();
                  setAddress(event.currentTarget.value);
                  setAccount(null);
                  setTransaction(null);
                }}
              />
              <small>
                Returns native SOL balance and the 10 newest signatures
                referencing this account. Token-account history is not expanded.
              </small>
            </div>
            <button
              className="button primary"
              disabled={loading !== null || !address.trim()}
            >
              <Search size={15} />
              {loading === "account" ? "Looking up…" : "Lookup account"}
            </button>
          </form>
        </section>
        <section className="panel">
          <PanelTitle icon={Link2} title="Inspect a transaction" />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              inspect(signature);
            }}
          >
            <div className="rpc-field">
              <label htmlFor="rpc-signature">Transaction signature</label>
              <input
                id="rpc-signature"
                value={signature}
                maxLength={88}
                placeholder="Paste a transaction signature"
                spellCheck={false}
                autoComplete="off"
                required
                onInput={(event) => {
                  cancel();
                  setSignature(event.currentTarget.value);
                  setTransaction(null);
                }}
              />
              <small>
                Fetch confirmed execution, fee and parsed JSON. Fixture
                signatures from the accounting examples are not live
                transactions.
              </small>
            </div>
            <button
              className="button primary"
              disabled={loading !== null || !signature.trim()}
            >
              <ArrowRight size={15} />
              {loading === "transaction" ? "Fetching…" : "Get transaction"}
            </button>
          </form>
        </section>
      </div>
      {error && (
        <div className="rpc-error" role="alert">
          <CircleAlert size={19} />
          <div>
            <strong>Lookup could not be completed</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
      {account && (
        <section className="panel rpc-account">
          <PanelTitle
            icon={Wallet}
            title="Live account result"
            right={
              <Badge tone="green">{account.balance.cluster} · confirmed</Badge>
            }
          />
          <div className="rpc-balance">
            <div>
              <span>Native balance</span>
              <strong>{account.balance.data.sol} SOL</strong>
              <small>{account.balance.data.lamports} lamports</small>
            </div>
            <dl>
              <Detail label="Address" mono>
                {account.balance.data.address}
              </Detail>
              <Detail label="Context slot" mono>
                {account.balance.data.slot}
              </Detail>
            </dl>
          </div>
          <div className="table-scroll">
            <table className="rpc-history">
              <thead>
                <tr>
                  <th>Signature</th>
                  <th>Slot</th>
                  <th>Time (UTC)</th>
                  <th>Execution</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {account.signatures.length ? (
                  account.signatures.map((row) => (
                    <tr key={row.signature}>
                      <td>
                        <TxHash hash={row.signature} />
                      </td>
                      <td className="mono">{row.slot}</td>
                      <td>
                        {row.blockTime === null
                          ? "Unavailable"
                          : new Date(row.blockTime * 1000)
                              .toISOString()
                              .replace("T", " ")
                              .slice(0, 19)}
                      </td>
                      <td>
                        <Badge tone={row.err === null ? "green" : "amber"}>
                          {row.err === null
                            ? (row.confirmationStatus ?? "Confirmed")
                            : "Failed"}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="text-button"
                          disabled={loading !== null}
                          onClick={() => inspect(row.signature)}
                        >
                          Inspect transaction
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <Link2 size={24} />
                        <strong>No recent signatures returned</strong>
                        <span>
                          The address may be unused or outside this RPC node’s
                          retained history.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {transaction && (
        <section className="panel rpc-transaction">
          <PanelTitle
            icon={Code2}
            title="Live transaction result"
            right={
              <Badge
                tone={
                  transaction.data.status === "confirmed" ? "green" : "amber"
                }
              >
                {transaction.data.status === "failed"
                  ? "Execution failed"
                  : transaction.data.status === "unknown"
                    ? "Execution status unknown"
                    : "Confirmed"}
              </Badge>
            }
          />
          <dl className="rpc-transaction-details">
            <Detail label="Network">{transaction.cluster}</Detail>
            <Detail label="Signature" mono>
              {transaction.data.signature}
            </Detail>
            <Detail label="Slot" mono>
              {transaction.data.slot}
            </Detail>
            <Detail label="Fee">
              {transaction.data.feeLamports === null
                ? "Unavailable"
                : `${BigInt(transaction.data.feeLamports).toLocaleString("en-US")} lamports`}
            </Detail>
            <Detail label="Version">{transaction.data.version}</Detail>
            <Detail label="Block time">
              {transaction.data.blockTime === null
                ? "Unavailable"
                : new Date(transaction.data.blockTime * 1000).toISOString()}
            </Detail>
          </dl>
          <div className="rpc-json-heading">
            <Code2 size={15} />
            Original JSON-RPC response · integer precision preserved
          </div>
          <pre className="rpc-json">
            <code>{transaction.data.rawJSON}</code>
          </pre>
        </section>
      )}
    </div>
  );
}
