import {
  ArrowRight,
  Check,
  CheckCheck,
  CircleHelp,
  ListFilter,
  ShieldCheck,
} from "lucide-react";
import { scenarios } from "../fixtures.ts";
import { amount, chainName } from "../domain.ts";
import { Badge, ChainMark, PanelTitle, TxHash } from "../components/ui.tsx";

export function Accounting({
  resolved,
  highlighted = false,
  filter,
  onFilter,
  onCapture,
}: {
  resolved: boolean;
  highlighted?: boolean;
  filter: "all" | "review";
  onFilter: (value: "all" | "review") => void;
  onCapture: () => void;
}) {
  const mayan = scenarios[0];
  return (
    <>
      <section
        className={`exception-banner ${resolved ? "success" : ""} ${highlighted ? "highlighted" : ""}`}
      >
        <span className="exception-icon">
          {resolved ? <CheckCheck size={23} /> : <CircleHelp size={23} />}
        </span>
        <div>
          <strong>
            {resolved
              ? "Automatically classified"
              : "Unclassified cross-chain activity"}
          </strong>
          <p>
            {resolved
              ? "Ethereum and Solana transactions are now connected to one Mayan bridge action."
              : "One outgoing transfer. One incoming transfer. No shared accounting context."}
          </p>
        </div>
        <Badge tone={resolved ? "green" : "amber"}>
          {resolved ? "0 unresolved exceptions" : "Needs manual review"}
        </Badge>
      </section>
      <section className="panel ledger-panel">
        <PanelTitle
          title={
            resolved ? "Semantic accounting ledger" : "Raw transaction ledger"
          }
          right={<Badge>{resolved ? "4 actions" : "5 entries"}</Badge>}
        />
        <div className="table-toolbar">
          <div className="filter-tabs">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => onFilter("all")}
            >
              All activity<span>{resolved ? 4 : 5}</span>
            </button>
            <button
              className={filter === "review" ? "active" : ""}
              onClick={() => onFilter("review")}
            >
              Needs review<span>{resolved ? 0 : 2}</span>
            </button>
          </div>
          <span>
            <ListFilter size={14} />
            Oct 08, 2026
          </span>
        </div>
        <div className="table-scroll">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Time (UTC)</th>
                <th>Chain</th>
                <th>Transaction</th>
                <th>Assets</th>
                <th>Protocol</th>
                <th>Classification</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filter === "review" && resolved ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <ShieldCheck size={26} />
                      <strong>No unresolved exceptions</strong>
                      <span>All four fixture actions are classified.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {resolved
                    ? filter === "all" && (
                        <tr className="grouped-row">
                          <td>
                            14:32<small>08 Oct</small>
                          </td>
                          <td>
                            <div className="two-chains">
                              <ChainMark chain="ethereum" />
                              <ArrowRight size={12} />
                              <ChainMark chain="solana" />
                            </div>
                            <small>ETH → SOL</small>
                          </td>
                          <td>
                            <strong>
                              Mayan Finance — Bridge 1,000 USDC
                              <br />
                              from Ethereum to Solana
                            </strong>
                            <small>
                              2 transactions correlated ·{" "}
                              <TxHash hash={mayan.transactions[0].hash} />
                            </small>
                          </td>
                          <td>
                            <strong>−1,000 USDC</strong>
                            <small className="green-text">+998.4 USDC</small>
                          </td>
                          <td>Mayan Finance</td>
                          <td>
                            <Badge tone="purple">BRIDGE</Badge>
                          </td>
                          <td>
                            <Badge tone="green">Automatically classified</Badge>
                          </td>
                        </tr>
                      )
                    : mayan.transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className={`review-row ${highlighted ? "highlighted-row" : ""}`}
                        >
                          <td>
                            14:32<small>08 Oct</small>
                          </td>
                          <td>
                            <span className="chain-label">
                              <ChainMark chain={tx.chain} />
                              {chainName(tx.chain)}
                            </span>
                          </td>
                          <td>
                            <TxHash hash={tx.hash} />
                            <small>{tx.description}</small>
                          </td>
                          <td>
                            <strong
                              className={
                                tx.assetChanges[0].direction === "in"
                                  ? "green-text"
                                  : ""
                              }
                            >
                              {tx.assetChanges[0].direction === "in"
                                ? "+"
                                : "−"}
                              {amount(tx.assetChanges[0].amount)} USDC
                            </strong>
                          </td>
                          <td>
                            <span className="muted">Unknown</span>
                          </td>
                          <td>
                            <Badge tone="amber">Unclassified</Badge>
                          </td>
                          <td>
                            <Badge tone="amber">Needs manual review</Badge>
                            <small className="confirmed-text">
                              <Check size={11} />
                              Onchain confirmed
                            </small>
                          </td>
                        </tr>
                      ))}
                  {filter === "all" &&
                    scenarios.slice(1).map((s) => (
                      <tr key={s.id}>
                        <td>
                          {s.transactions[0].timestamp.slice(11, 16)}
                          <small>08 Oct</small>
                        </td>
                        <td>
                          <span className="chain-label">
                            <ChainMark chain="solana" />
                            Solana
                          </span>
                        </td>
                        <td>
                          <TxHash
                            hash={
                              s.transactions[s.transactions.length - 1].hash
                            }
                          />
                          <small>
                            {s.subtitle} · {s.transactions.length} tx
                            {s.transactions.length > 1 ? "s" : ""}
                          </small>
                        </td>
                        <td>
                          <strong>
                            {amount(s.requestedAmount)}
                            {s.id !== "raydium" ? ` ${s.inputAsset}` : ""}
                          </strong>
                        </td>
                        <td>{s.intent.protocol}</td>
                        <td>
                          <Badge>{s.intent.action.replaceAll("_", " ")}</Badge>
                        </td>
                        <td>
                          <Badge tone="green">Automatically classified</Badge>
                        </td>
                      </tr>
                    ))}
                </>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span>
            <span className="status-dot" />
            {resolved
              ? "7 transactions → 4 semantic actions"
              : "Other fixture actions are pre-classified; Mayan is the open exception."}
          </span>
          <span>Demo hashes · no explorer verification</span>
        </div>
      </section>
      {resolved ? (
        <section className="comparison">
          <div className="panel">
            <p className="eyebrow">BEFORE INTENTLEDGER</p>
            <h3>Two disconnected transactions</h3>
            <div className="comparison-row">
              <span>Ethereum · −1,000 USDC</span>
              <Badge tone="amber">Unclassified</Badge>
            </div>
            <div className="comparison-row">
              <span>Solana · +998.4 USDC</span>
              <Badge tone="amber">Unclassified</Badge>
            </div>
            <p className="comparison-note">
              Requires a person to reconstruct the action.
            </p>
          </div>
          <span className="comparison-arrow">
            <ArrowRight size={22} />
          </span>
          <div className="panel after-panel">
            <p className="eyebrow">AFTER INTENTLEDGER</p>
            <h3>One evidence-backed bridge</h3>
            <p>Mayan Finance — Bridge 1,000 USDC from Ethereum to Solana.</p>
            <Badge tone="green">Automatically classified</Badge>
            <button className="text-button" onClick={onCapture}>
              Inspect the semantic record
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
      ) : (
        <section className="explanation-card">
          <div>
            <span className="eyebrow">THE MISSING CONNECTION</span>
            <h3>Different chains. Same user action.</h3>
            <p>
              Amounts alone can’t prove these transactions belong together.
              <br />
              The original intent and wallet request supply the missing
              evidence.
            </p>
          </div>
          <button className="button primary" onClick={onCapture}>
            Capture the intent
            <ArrowRight size={15} />
          </button>
        </section>
      )}
    </>
  );
}
