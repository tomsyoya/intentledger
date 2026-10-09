import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  FileCheck2,
  Globe2,
  Link2,
  Radio,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { scenarios } from "../fixtures.ts";
import { amount } from "../domain.ts";
import { Badge, ProtocolMark, PanelTitle } from "../components/ui.tsx";

export function Overview({
  resolved,
  onSelect,
  onLedger,
}: {
  resolved: boolean;
  onSelect: (id: string) => void;
  onLedger: () => void;
}) {
  return (
    <>
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="tiny-mark" /> THE CONTEXT LAYER FOR DEFI ACCOUNTING
          </span>
          <h2>
            Capture DeFi intent
            <br />
            before it gets lost
            <br />
            in the <span>transaction.</span>
          </h2>
          <p>
            IntentLedger connects what users intended, what wallets signed, and
            what blockchains executed — producing structured semantic records
            for DeFi accounting.
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={onLedger}>
              Explore captured actions
              <ArrowRight size={15} />
            </button>
            <span>
              <span className="status-dot" />
              No wallet connection required
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-top">
            <span className="mini-label">ONE INTENT. A COMPLETE STORY.</span>
            <Badge tone="green">Connected</Badge>
          </div>
          <div className="flow-source">
            <span className="flow-node">
              <Radio size={20} />
            </span>
            <div>
              <strong>User intent</strong>
              <span>“Bridge 1,000 USDC to Solana”</span>
            </div>
            <span className="flow-number">01</span>
          </div>
          <div className="flow-line">
            <span />
            <span className="flow-line-label">context preserved</span>
            <span />
          </div>
          <div className="flow-middle">
            <div>
              <Wallet size={18} />
              <strong>Wallet request</strong>
              <span>Matched to intent</span>
              <Check size={14} />
            </div>
            <span className="middle-plus">+</span>
            <div>
              <Link2 size={18} />
              <strong>Onchain execution</strong>
              <span>Both chains confirmed</span>
              <Check size={14} />
            </div>
          </div>
          <div className="flow-line bottom-line">
            <span />
            <ArrowDown size={16} />
            <span />
          </div>
          <div className="flow-result">
            <span className="result-icon">
              <FileCheck2 size={22} />
            </span>
            <div>
              <strong>Semantic record</strong>
              <span>BRIDGE · Mayan Finance</span>
            </div>
            <ShieldCheck size={21} />
            <div className="result-caption">
              <span className="status-dot" />
              Accounting-ready. Evidence-backed.
            </div>
          </div>
          <div className="visual-caption">
            Intent <ArrowRight size={12} /> Request <ArrowRight size={12} />{" "}
            Execution <ArrowRight size={12} /> Meaning
          </div>
        </div>
      </section>
      <section className="metrics" aria-label="Workspace metrics">
        {[
          {
            label: "Captured actions",
            value: "4",
            note: "User intent preserved",
            icon: Radio,
          },
          {
            label: "Transactions correlated",
            value: "7",
            note: "Across all four actions",
            icon: Link2,
          },
          {
            label: "Connected protocols",
            value: "4",
            note: "Mayan, Jupiter, Kamino, Raydium",
            icon: Boxes,
          },
          {
            label: "Supported chains",
            value: "2",
            note: "Ethereum + Solana",
            icon: Globe2,
          },
          {
            label: "Unresolved exceptions",
            value: resolved ? "0" : "1",
            note: resolved ? "All actions classified" : "0 after IntentLedger",
            icon: ShieldCheck,
          },
        ].map(({ label, value, note, icon: Icon }) => (
          <div className="metric-card" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={16} />
            </div>
            <strong
              className={
                label === "Unresolved exceptions"
                  ? resolved
                    ? "green-text"
                    : "amber-text"
                  : ""
              }
            >
              {value}
            </strong>
            <small>
              {label === "Unresolved exceptions" && (
                <span className={`status-dot ${resolved ? "" : "amber-dot"}`} />
              )}
              {note}
            </small>
          </div>
        ))}
      </section>
      <div className="dashboard-bottom">
        <section className="panel activity-panel">
          <PanelTitle
            title="Captured actions"
            right={
              <button className="text-button" onClick={onLedger}>
                View ledger
                <ArrowRight size={14} />
              </button>
            }
          />
          <div className="table-scroll">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Protocol / action</th>
                  <th>Asset movement</th>
                  <th>Classification</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.id} onClick={() => onSelect(s.id)}>
                    <td>
                      <div className="protocol-cell">
                        <ProtocolMark scenario={s} small />
                        <div>
                          <strong>{s.intent.protocol}</strong>
                          <small>
                            {s.intent.action.replaceAll("_", " ").toLowerCase()}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong className="movement-value">
                        {amount(s.requestedAmount)}
                        {s.id !== "raydium" ? ` ${s.inputAsset}` : ""}
                      </strong>
                      <small>
                        {s.id === "mayan"
                          ? "Ethereum → Solana"
                          : s.id === "raydium"
                            ? "3 movements → 1 action"
                            : `→ ${amount(s.receivedAmount)} ${s.outputAsset}`}
                      </small>
                    </td>
                    <td>
                      <Badge
                        tone={s.id === "mayan" && !resolved ? "amber" : "green"}
                      >
                        {s.id === "mayan" && !resolved
                          ? "Needs review"
                          : "Classified"}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="row-button"
                        aria-label={`Explore ${s.shortName}`}
                        onClick={() => onSelect(s.id)}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            <span>4 captured actions · 7 onchain transactions</span>
            <span>All data is simulated</span>
          </div>
        </section>
        <section className="panel insight-card">
          <span className="insight-icon">
            <Sparkles size={21} />
          </span>
          <p className="eyebrow">WHY INTENT MATTERS</p>
          <h3>
            A transfer tells you
            <br />
            <span>what moved.</span>
            <br />
            Intent tells you why.
          </h3>
          <p>
            A bridge can look like an unrelated withdrawal and deposit.
            IntentLedger keeps the connection intact.
          </p>
          <div className="insight-stat">
            <span>2 transactions</span>
            <ArrowRight size={17} />
            <strong>1 clear action</strong>
          </div>
          <button className="text-button" onClick={() => onSelect("mayan")}>
            Follow the Mayan example
            <ArrowRight size={15} />
          </button>
        </section>
      </div>
    </>
  );
}
