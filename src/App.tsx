import { useEffect, useReducer, useRef, useState } from "react";
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
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { scenarios } from "./fixtures.ts";
import {
  amount,
  classify,
  DEMO_STEPS,
  demoReducer,
  initialDemoState,
} from "./domain.ts";
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
  const [demo, dispatch] = useReducer(demoReducer, initialDemoState);
  const [filter, setFilter] = useState<"all" | "review">("all");
  const [notice, setNotice] = useState("");
  const [about, setAbout] = useState(false);
  const scenario = scenarios.find((s) => s.id === selected)!;
  const record = classify(scenario);
  const nextTick = useRef(0);
  useEffect(() => {
    if (!demo.playing) return;
    nextTick.current = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "TICK", delta: now - nextTick.current });
      nextTick.current = now;
    }, 100);
    return () => window.clearInterval(interval);
  }, [demo.playing]);
  useEffect(() => {
    if (!demo.active) return;
    setScreen(DEMO_STEPS[demo.step].screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (demo.step >= 6) setResolved(true);
  }, [demo.step, demo.active]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  const navigate = (page: Screen) => {
    dispatch({ type: "RESTART" });
    if (page === "exceptions" || page === "resolved") setSelected("mayan");
    setScreen(page);
  };
  const choose = (id: string) => {
    dispatch({ type: "RESTART" });
    setSelected(id);
    setScreen("intent");
  };
  const play = () => {
    if (!demo.active || demo.completed) {
      setSelected("mayan");
      setResolved(false);
      setFilter("all");
      dispatch({ type: "RESTART" });
      setScreen("exceptions");
    }
    dispatch({ type: "PLAY" });
  };
  const restart = () => {
    dispatch({ type: "RESTART" });
    setSelected("mayan");
    setResolved(false);
    setFilter("all");
    setScreen("exceptions");
  };
  const finish = () => {
    dispatch({ type: "RESTART" });
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
  const progress =
    ((DEMO_STEPS.slice(0, demo.step).reduce(
      (sum, step) => sum + step.duration,
      0,
    ) +
      demo.elapsed) /
      52000) *
    100;
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
            Demo workspace<small>Colosseum hackathon</small>
          </span>
          <Badge tone="purple">Demo</Badge>
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
      <div className={`main-shell ${demo.active ? "presentation" : ""}`}>
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
              aria-label="About demo workspace"
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
            <button className="button primary" onClick={play}>
              <Play size={15} fill="currentColor" />
              {screen === "overview" ? "Run Demo" : "Play Automated Demo"}
            </button>
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
              onPlay={play}
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
                    highlighted={demo.active && demo.step === 1}
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
        <div className={`demo-player ${demo.active ? "running" : ""}`}>
          <div className="demo-description">
            <span className="demo-icon">
              <Play size={16} fill="currentColor" />
            </span>
            <div>
              <strong>
                {demo.active
                  ? DEMO_STEPS[demo.step].title
                  : "See the full story in 52 seconds"}
              </strong>
              <p>
                {demo.active
                  ? DEMO_STEPS[demo.step].caption
                  : "From a manual exception to a classified cross-chain bridge. One guided walkthrough."}
              </p>
            </div>
          </div>
          <div className="demo-controls">
            {demo.active && (
              <span className="demo-step">
                {demo.completed ? "Complete" : `${demo.step + 1} / 8`}
              </span>
            )}
            <button
              className={`button ${demo.active ? "primary" : "dark"}`}
              onClick={demo.playing ? () => dispatch({ type: "PAUSE" }) : play}
            >
              {demo.playing ? (
                <Pause size={14} />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
              {demo.playing
                ? "Pause"
                : demo.active
                  ? demo.completed
                    ? "Replay"
                    : "Resume"
                  : "Play Automated Demo"}
            </button>
            <button
              className="icon-button"
              onClick={restart}
              aria-label="Restart"
              title="Restart"
            >
              <RotateCcw size={17} />
            </button>
            <button
              className="icon-button"
              onClick={() => {
                if (!demo.active) {
                  setSelected("mayan");
                  setResolved(false);
                  dispatch({ type: "PLAY" });
                  dispatch({ type: "PAUSE" });
                }
                dispatch({ type: "NEXT" });
              }}
              aria-label="Next step"
              title="Next step"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          {demo.active && (
            <div className="demo-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
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
                play();
              }}
            >
              <Play size={15} />
              Explore the demo
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
