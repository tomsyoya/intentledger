import {
  ArrowRight,
  CheckCheck,
  Code2,
  Copy,
  Download,
  FileCheck2,
  FileJson2,
  ShieldCheck,
} from "lucide-react";
import type { Scenario, SemanticRecord } from "../types.ts";
import { amount, chainName } from "../domain.ts";
import { Badge, PanelTitle, Detail } from "../components/ui.tsx";

export function RecordView({
  scenario: s,
  record,
  onExport,
  onClassify,
  onNotice,
}: {
  scenario: Scenario;
  record: SemanticRecord;
  onExport: () => void;
  onClassify: () => void;
  onNotice: (message: string) => void;
}) {
  const json = JSON.stringify(
    {
      id: record.id,
      action: record.action,
      protocol: record.protocol,
      origin: record.origin,
      sourceChain: record.sourceChain,
      destinationChain: record.destinationChain,
      inputAsset: record.inputAsset,
      requestedAmount: record.requestedAmount,
      receivedAmount: record.receivedAmount,
      ...(s.intent.parameters.slippage
        ? { slippage: s.intent.parameters.slippage }
        : {}),
      sourceTransaction: record.sourceTransaction,
      ...(record.destinationTransaction
        ? { destinationTransaction: record.destinationTransaction }
        : {}),
      ...(record.position ? { position: record.position } : {}),
      status: record.status,
      confidence: record.confidence,
      evidence: record.evidence,
    },
    null,
    2,
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      onNotice("JSON copied to clipboard");
    } catch {
      onNotice("Clipboard unavailable. Use Export JSON to save the record.");
    }
  };
  return (
    <>
      <section className="record-summary">
        <div className="record-success">
          <FileCheck2 size={26} />
        </div>
        <div>
          <div className="summary-title">
            <span className="eyebrow">SEMANTIC RECORD GENERATED</span>
            <Badge tone="green">SUCCESS</Badge>
            <Badge tone="purple">HIGH confidence</Badge>
          </div>
          <h2>{record.humanReadableSummary}</h2>
          <div className="evidence-badges">
            {record.evidence.map((evidence) => (
              <span key={evidence}>
                <CheckCheck size={14} />
                {evidence}
              </span>
            ))}
          </div>
        </div>
      </section>
      <div className="record-grid">
        <section className="panel record-details">
          <PanelTitle icon={FileCheck2} title="Accounting interpretation" />
          <dl>
            <Detail label="Action">
              <Badge tone="purple">{record.action}</Badge>
            </Detail>
            <Detail label="Protocol">{record.protocol}</Detail>
            <Detail label="Source chain">
              {chainName(record.sourceChain)}
            </Detail>
            <Detail label="Destination chain">
              {chainName(record.destinationChain)}
            </Detail>
            <Detail label="Requested">
              {amount(record.requestedAmount)}
              {s.id !== "raydium" ? ` ${s.inputAsset}` : ""}
            </Detail>
            <Detail label="Received">
              {amount(record.receivedAmount)} {s.outputAsset}
            </Detail>
            <Detail label="Status">
              <span className="green-text">SUCCESS</span>
            </Detail>
            <Detail label="Confidence">HIGH · complete fixture evidence</Detail>
          </dl>
          {s.position && (
            <div className="position-card">
              <span className="eyebrow">RESULTING DEFI POSITION</span>
              <p>{s.position}</p>
            </div>
          )}
          <div className="accounting-note">
            <ShieldCheck size={18} />
            <p>
              One user action, with {s.transactions.length} transaction
              {s.transactions.length > 1 ? "s" : ""} and the original intent
              attached.
            </p>
          </div>
        </section>
        <section className="code-panel">
          <div className="code-title">
            <span>
              <FileJson2 size={16} />
              semantic-record.json
            </span>
            <button onClick={copy} className="code-copy" aria-label="Copy JSON">
              <Copy size={15} />
              Copy
            </button>
          </div>
          <pre>
            <code>
              {json.split("\n").map((line, index) => (
                <span className="code-line" key={index}>
                  <span className="line-number">{index + 1}</span>
                  <span>
                    {line.includes(":") ? (
                      <>
                        <span className="json-key">
                          {line.slice(0, line.indexOf(":") + 1)}
                        </span>
                        <span className="json-value">
                          {line.slice(line.indexOf(":") + 1)}
                        </span>
                      </>
                    ) : (
                      line
                    )}
                  </span>
                </span>
              ))}
            </code>
          </pre>
          <div className="code-foot">
            <Code2 size={13} />
            <span>Structured. Portable. Ready for downstream accounting.</span>
          </div>
        </section>
      </div>
      <div className="record-actions">
        <span>
          <CheckCheck size={17} />
          The full evidence trail is included in the export.
        </span>
        <div>
          <button className="button secondary" onClick={onExport}>
            <Download size={15} />
            Export JSON
          </button>
          <button className="button primary" onClick={onClassify}>
            {s.id === "mayan"
              ? "Apply to accounting ledger"
              : "View accounting ledger"}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
