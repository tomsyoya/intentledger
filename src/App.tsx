import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  Layers3,
  LayoutDashboard,
  Link2,
  Radio,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { scenarios } from "./fixtures.ts";
import { amount, classify } from "./domain.ts";
import type { Screen } from "./domain.ts";
import { Badge, ProtocolMark } from "./components/ui.tsx";
import { Overview } from "./screens/Overview.tsx";
import { Accounting } from "./screens/Accounting.tsx";
import {
  IntentCapture,
  WalletRequestView,
  Execution,
} from "./screens/Evidence.tsx";
import { RecordView } from "./screens/Record.tsx";

const screens: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "exceptions", label: "Accounting ledger", icon: Layers3 },
  { id: "record", label: "Semantic records", icon: FileCheck2 },
];
const layers: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: "intent", label: "Intent capture", icon: Radio },
  { id: "wallet", label: "Wallet request", icon: Wallet },
  { id: "execution", label: "Onchain execution", icon: Link2 },
  { id: "record", label: "Semantic record", icon: FileCheck2 },
];
const headings: Record<
  Screen,
  { title: string; eyebrow: string; description: string }
> = {
  overview: {
    title: "DeFi, with context.",
    eyebrow: "WORKSPACE OVERVIEW",
    description:
      "From scattered transactions to a ledger that understands what happened.",
  },
  exceptions: {
    title: "Transactions without the story.",
    eyebrow: "ACCOUNTING LEDGER",
    description:
      "The tokens moved. But raw transactions don’t tell you what the user intended.",
  },
  intent: {
    title: "It starts with intent.",
    eyebrow: "EVIDENCE LAYER 01",
    description:
      "Capture the context the dApp already has, before the transaction is submitted.",
  },
  wallet: {
    title: "Connect intent to the request.",
    eyebrow: "EVIDENCE LAYER 02",
    description:
      "Match the user’s action to the structured request received by their wallet.",
  },
  execution: {
    title: "Follow the actual execution.",
    eyebrow: "EVIDENCE LAYER 03",
    description:
      "Link confirmed transactions to the original action, even across chains.",
  },
  record: {
    title: "One action. One clear record.",
    eyebrow: "SEMANTIC RECORD",
    description:
      "An evidence-backed accounting record, with the full transaction story attached.",
  },
  resolved: {
    title: "A ledger that makes sense.",
    eyebrow: "ACCOUNTING LEDGER · RESOLVED",
    description:
      "The same transactions. Now connected, classified and ready for accounting.",
  },
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("overview");
  const [selected, setSelected] = useState("mayan");
  const [resolved, setResolved] = useState(false);
  const [filter, setFilter] = useState<"all" | "review">("all");
  const [notice, setNotice] = useState("");
  const [about, setAbout] = useState(false);
  const scenario = scenarios.find((s) => s.id === selected)!;
  const record = classify(scenario);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  const navigate = (page: Screen) => {
    if (page === "exceptions" || page === "resolved") setSelected("mayan");
    setScreen(page);
  };
  const choose = (id: string) => {
    setSelected(id);
    setScreen("intent");
  };
  const finish = () => {
    setResolved(true);
    setScreen("resolved");
  };
  const exportRecord = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `intentledger-${scenario.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Semantic record exported");
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="IntentLedger overview"
        >
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>
            IntentLedger<span className="brand-dot">.</span>
          </span>
        </button>
        <div className="workspace">
          <span className="workspace-avatar">IL</span>
          <span>
            Local workspace<small>Colosseum hackathon</small>
          </span>
          <Badge tone="purple">Local</Badge>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {screens.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${screen === id || (id === "exceptions" && screen === "resolved") ? "active" : ""}`}
              onClick={() =>
                navigate(id === "exceptions" && resolved ? "resolved" : id)
              }
            >
              <Icon size={18} />
              {label}
              {id === "exceptions" && !resolved && (
                <span className="nav-count">1</span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-label scenario-label">
          CAPTURED ACTIONS <span>4</span>
        </div>
        <div className="scenario-list">
          {scenarios.map((s) => (
            <button
              key={s.id}
              aria-label={`${s.shortName} action`}
              className={`scenario-item ${selected === s.id ? "selected" : ""}`}
              onClick={() => choose(s.id)}
            >
              <ProtocolMark scenario={s} small />
              <span>
                {s.shortName}
                <small>{s.subtitle}</small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="local-indicator">
            <span className="status-dot" />
            All systems local<span className="mono">v0.1</span>
          </div>
          <p>
            No wallet needed.
            <br />
            No real funds moved.
          </p>
          <button className="help-button" onClick={() => setAbout(true)}>
            <CircleHelp size={17} />
            About this prototype
            <ArrowUpRight size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={13} />
            <span>
              {screen === "overview" ? "Overview" : scenario.intent.protocol}
            </span>
            {screen !== "overview" && (
              <>
                <ChevronRight size={13} />
                <span>
                  {headings[screen].eyebrow.split(" · ")[0].toLowerCase()}
                </span>
              </>
            )}
          </div>
          <div className="topbar-right">
            <span className="fixture-tag">
              <span className="status-dot" />
              Fixture data
            </span>
            <button
              className="avatar"
              onClick={() => setAbout(true)}
              aria-label="About workspace"
            >
              IL
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">{headings[screen].eyebrow}</p>
              <h1>{headings[screen].title}</h1>
              <p className="page-description">{headings[screen].description}</p>
            </div>
            {screen === "overview" && (
              <button
                className="button primary"
                onClick={() => navigate(resolved ? "resolved" : "exceptions")}
              >
                View accounting ledger
                <ArrowRight size={15} />
              </button>
            )}
          </div>
          {screen !== "overview" && (
            <div className="context-strip">
              <div className="context-protocol">
                <ProtocolMark scenario={scenario} small />
                <strong>{scenario.intent.protocol}</strong>
                <Badge>{scenario.intent.action.replaceAll("_", " ")}</Badge>
              </div>
              <span className="context-amount">
                {amount(scenario.requestedAmount)}
                {scenario.id !== "raydium" ? ` ${scenario.inputAsset}` : ""}
                <ArrowRight size={14} />
                {amount(scenario.receivedAmount)} {scenario.outputAsset}
              </span>
              <span className="fixture-label">Simulated · Oct 08, 2026</span>
            </div>
          )}
          {screen === "overview" ? (
            <Overview
              resolved={resolved}
              onSelect={choose}
              onLedger={() => navigate(resolved ? "resolved" : "exceptions")}
            />
          ) : (
            <>
              {screen !== "exceptions" && screen !== "resolved" && (
                <div
                  className="layer-tabs"
                  role="tablist"
                  aria-label="Evidence layers"
                >
                  {layers.map(({ id, label, icon: Icon }, index) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={screen === id}
                      className={screen === id ? "active" : ""}
                      onClick={() => navigate(id)}
                    >
                      <span className="step-number">0{index + 1}</span>
                      <Icon size={16} />
                      {label}
                      {index < 3 && (
                        <ChevronRight className="tab-chevron" size={14} />
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="screen-content" key={`${screen}-${selected}`}>
                {screen === "exceptions" && (
                  <Accounting
                    resolved={false}
                    filter={filter}
                    onFilter={setFilter}
                    onCapture={() => navigate("intent")}
                  />
                )}
                {screen === "resolved" && (
                  <Accounting
                    resolved
                    filter={filter}
                    onFilter={setFilter}
                    onCapture={() => navigate("record")}
                  />
                )}
                {screen === "intent" && (
                  <IntentCapture
                    scenario={scenario}
                    onNext={() => navigate("wallet")}
                  />
                )}
                {screen === "wallet" && (
                  <WalletRequestView
                    scenario={scenario}
                    onNext={() => navigate("execution")}
                  />
                )}
                {screen === "execution" && (
                  <Execution
                    scenario={scenario}
                    onNext={() => navigate("record")}
                  />
                )}
                {screen === "record" && (
                  <RecordView
                    scenario={scenario}
                    record={record}
                    onExport={exportRecord}
                    onClassify={
                      scenario.id === "mayan"
                        ? finish
                        : () => {
                            setNotice(
                              `${scenario.intent.protocol} record is already automatically classified`,
                            );
                            navigate(resolved ? "resolved" : "exceptions");
                          }
                    }
                    onNotice={setNotice}
                  />
                )}
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={14} />
              Intent preserved. Evidence connected.
            </span>
            <span>
              Built for Colosseum <span className="footer-dot">·</span> Static
              prototype
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <CheckCheck size={17} />
          {notice}
        </div>
      )}
      {about && (
        <div className="modal-backdrop" onClick={() => setAbout(false)}>
          <section
            className="about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              autoFocus
              className="icon-button close-modal"
              onClick={() => setAbout(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <span className="eyebrow">COLOSSEUM HACKATHON PROTOTYPE</span>
            <h2 id="about-title">The transaction is only half the story.</h2>
            <p>
              IntentLedger preserves the meaning of a DeFi action before it
              disappears into raw blockchain data.
            </p>
            <p>
              This interactive prototype runs entirely in your browser. All
              transactions, addresses, matching relationships and execution
              results are local fixtures. It does not connect a wallet or
              perform transfers.
            </p>
            <div className="note">
              <ShieldCheck size={18} />
              <span>
                HIGH confidence describes complete evidence in this fixture.
                Production confidence requires independent execution
                verification.
              </span>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setAbout(false);
                navigate(resolved ? "resolved" : "exceptions");
              }}
            >
              <ArrowRight size={15} />
              Explore captured actions
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
