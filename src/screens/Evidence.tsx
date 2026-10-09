import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Check,
  CircleHelp,
  Link2,
  Radio,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { SOL_WALLET } from "../fixtures.ts";
import type { Scenario } from "../types.ts";
import { amount, chainName, compact } from "../domain.ts";
import {
  Badge,
  ProtocolMark,
  ChainMark,
  PanelTitle,
  Detail,
  TxHash,
  NextCard,
} from "../components/ui.tsx";

export function IntentCapture({
  scenario: s,
  onNext,
}: {
  scenario: Scenario;
  onNext: () => void;
}) {
  return (
    <>
      <div className="evidence-grid">
        <section className="panel simulated-ui">
          <PanelTitle
            title="The user’s dApp interaction"
            right={<Badge>Simulated UI</Badge>}
          />
          <div className="dapp-inner">
            <div className="dapp-brand">
              <ProtocolMark scenario={s} />
              <strong>{s.intent.protocol}</strong>
              <span className="dapp-origin">
                {s.intent.origin}
                <ArrowUpRight size={12} />
              </span>
            </div>
            <div className="mock-tabs">
              <span className="active">
                {s.intent.action === "BRIDGE"
                  ? "Bridge"
                  : s.intent.action === "SWAP"
                    ? "Swap"
                    : s.intent.action === "DEPOSIT"
                      ? "Supply"
                      : "Add liquidity"}
              </span>
              <span>{s.intent.action === "BRIDGE" ? "Swap" : "Positions"}</span>
            </div>
            <div className="asset-input">
              <div>
                <span>
                  {s.intent.action === "DEPOSIT"
                    ? "You deposit"
                    : s.intent.action === "ADD_LIQUIDITY"
                      ? "You supply"
                      : "You send"}
                </span>
                <span className="chain-label">
                  <ChainMark chain={s.sourceChain} />
                  {chainName(s.sourceChain)}
                </span>
              </div>
              <div className="asset-amount">
                <strong>{amount(s.requestedAmount)}</strong>
                {s.id !== "raydium" && (
                  <span
                    className={`token-symbol ${s.inputAsset === "SOL" ? "sol-token" : ""}`}
                  >
                    {s.inputAsset === "USDC" && <span>$</span>}
                    {s.inputAsset}
                  </span>
                )}
              </div>
              <small>Requested amount · captured before signing</small>
            </div>
            <span className="swap-arrow">
              <ArrowDown size={18} />
            </span>
            <div className="asset-input output-input">
              <div>
                <span>{s.position ? "Your position" : "You receive"}</span>
                <span className="chain-label">
                  <ChainMark chain={s.destinationChain} />
                  {chainName(s.destinationChain)}
                </span>
              </div>
              <div className="asset-amount">
                <strong>{amount(s.expectedAmount)}</strong>
                <span className="token-symbol">
                  {s.outputAsset === "USDC" && <span>$</span>}
                  {s.outputAsset}
                </span>
              </div>
              <small>Expected output · actual execution verified later</small>
            </div>
            {s.id === "mayan" ? (
              <div className="destination-wallet">
                <span>Destination wallet</span>
                <span className="mono" title={SOL_WALLET}>
                  {compact(SOL_WALLET)}
                  <Wallet size={13} />
                </span>
              </div>
            ) : (
              <div className="destination-wallet">
                <span>{s.position ? "Position" : "Slippage tolerance"}</span>
                <span>
                  {s.position
                    ? s.intent.parameters.market || s.intent.parameters.pool
                    : s.intent.parameters.slippage}
                </span>
              </div>
            )}
            <div className="simulated-submit">
              <ShieldCheck size={16} />
              {s.intent.action === "BRIDGE"
                ? "Bridge intent observed"
                : "Action intent observed"}
              <Check size={16} />
            </div>
            <p className="simulation-note">
              A representation of the interaction, not a live protocol
              interface.
            </p>
          </div>
        </section>
        <section className="panel observed-panel">
          <PanelTitle
            icon={Radio}
            title="Observed Intent"
            right={<Badge tone="purple">UI OBSERVED</Badge>}
          />
          <div className="observed-body">
            <div className="capture-status">
              <span className="pulse-dot" />
              <span>Context captured before submission</span>
            </div>
            <dl>
              <Detail label="Action">
                <Badge tone="purple">{s.intent.action}</Badge>
              </Detail>
              <Detail label="Protocol">{s.intent.protocol}</Detail>
              <Detail label="Origin" mono>
                {s.intent.origin}
              </Detail>
              <Detail label="Source">{chainName(s.sourceChain)}</Detail>
              <Detail label="Destination">
                {chainName(s.destinationChain)}
              </Detail>
              <Detail label="Amount">
                {amount(s.requestedAmount)}
                {s.id !== "raydium" ? ` ${s.inputAsset}` : ""}
              </Detail>
              {s.intent.parameters.slippage && (
                <Detail label="Slippage">{s.intent.parameters.slippage}</Detail>
              )}
              <Detail label="Wallet" mono>
                <TxHash hash={s.intent.wallet} />
              </Detail>
              <Detail label="Intent ID" mono>
                {s.intent.id}
              </Detail>
              <Detail label="Captured at">
                {s.intent.timestamp.slice(11, 19)} UTC
              </Detail>
            </dl>
            <div className="note">
              <CircleHelp size={17} />
              <p>
                The dApp knows <strong>why</strong> this transaction exists.
                IntentLedger preserves that context.
              </p>
            </div>
          </div>
        </section>
      </div>
      <NextCard
        label="Intent captured. Next, connect it to what the wallet received."
        button="View wallet request"
        onNext={onNext}
      />
    </>
  );
}
export function WalletRequestView({
  scenario: s,
  onNext,
}: {
  scenario: Scenario;
  onNext: () => void;
}) {
  return (
    <>
      <div className="match-strip">
        <div>
          <Radio size={18} />
          <span>
            Observed intent<strong>{s.intent.id}</strong>
          </span>
        </div>
        <div className="match-connection">
          <span />
          <Badge tone="green">
            <Link2 size={12} />
            Matched
          </Badge>
          <span />
        </div>
        <div>
          <Wallet size={18} />
          <span>
            Wallet request<strong>{s.walletRequest.id}</strong>
          </span>
        </div>
      </div>
      <div className="evidence-grid wallet-grid">
        <section className="panel">
          <PanelTitle
            icon={Wallet}
            title="What the wallet received"
            right={<Badge tone="green">Request matched</Badge>}
          />
          <div className="request-body">
            <p className="request-summary">{s.walletRequest.payloadSummary}</p>
            <dl>
              <Detail label="Wallet" mono>
                {s.walletRequest.wallet}
              </Detail>
              <Detail label="Chain">
                <span className="chain-label">
                  <ChainMark chain={s.walletRequest.chain} />
                  {chainName(s.walletRequest.chain)}
                </span>
              </Detail>
              <Detail label="Destination contract / program" mono>
                {s.walletRequest.target}
              </Detail>
              <Detail label="Request method" mono>
                {s.walletRequest.method}
              </Detail>
              <Detail label="Request timestamp">
                {s.walletRequest.timestamp
                  .replace("T", " ")
                  .replace("Z", " UTC")}
              </Detail>
              <Detail label="Transaction request identifier" mono>
                {s.walletRequest.id}
              </Detail>
            </dl>
          </div>
        </section>
        <section className="panel connection-panel">
          <span className="connection-icon">
            <Link2 size={26} />
          </span>
          <p className="eyebrow">CORRELATION, NOT GUESSWORK</p>
          <h3>
            The same action.
            <br />A verifiable handoff.
          </h3>
          <p>
            Shared intent IDs and wallet context link the UI action to the
            wallet’s transaction request.
          </p>
          <div className="checks-list">
            <span>
              <Check size={16} />
              Intent reference matches
            </span>
            <span>
              <Check size={16} />
              Source wallet matches
            </span>
            <span>
              <Check size={16} />
              Source chain matches
            </span>
            <span>
              <Check size={16} />
              Request follows UI observation
            </span>
          </div>
          <div className="note">
            <ShieldCheck size={17} />
            <p>No private keys are captured or required.</p>
          </div>
        </section>
      </div>
      <NextCard
        label="The request is linked. Now verify what actually happened onchain."
        button="Follow execution"
        onNext={onNext}
      />
    </>
  );
}
export function Execution({
  scenario: s,
  onNext,
}: {
  scenario: Scenario;
  onNext: () => void;
}) {
  return (
    <>
      <div className="execution-header">
        <span>
          <span className="status-dot" />
          {s.transactions.length} confirmed transaction
          {s.transactions.length > 1 ? "s" : ""} linked to {s.intent.id}
        </span>
        <Badge>Demo fixture hashes</Badge>
      </div>
      <div className="execution-timeline">
        {s.transactions.map((tx, index) => (
          <div className="timeline-item" key={tx.id}>
            <div className="timeline-rail">
              <span>
                <ChainMark chain={tx.chain} />
              </span>
              {index < s.transactions.length - 1 && <div />}
            </div>
            <div className="panel transaction-card">
              <div className="transaction-title">
                <div>
                  <span className="eyebrow">
                    {s.id === "mayan"
                      ? index === 0
                        ? "SOURCE TRANSACTION"
                        : "DESTINATION TRANSACTION"
                      : `TRANSACTION 0${index + 1}`}
                  </span>
                  <h3>
                    {chainName(tx.chain)}
                    <span>{tx.description}</span>
                  </h3>
                </div>
                <Badge tone="green">Confirmed</Badge>
              </div>
              <div className="execution-assets">
                {tx.assetChanges.length ? (
                  tx.assetChanges.map((change, i) => (
                    <div
                      key={i}
                      className={`execution-asset ${change.direction}`}
                    >
                      <span>
                        {change.direction === "out" ? (
                          <ArrowUpRight size={19} />
                        ) : (
                          <ArrowDownLeft size={19} />
                        )}
                      </span>
                      <div>
                        <strong>
                          {change.direction === "in" ? "+" : "−"}
                          {amount(change.amount)} {change.asset}
                        </strong>
                        <small>
                          {change.direction === "in"
                            ? "Received / minted"
                            : "Sent from wallet"}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="execution-asset">
                    <span>
                      <Boxes size={19} />
                    </span>
                    <div>
                      <strong>Position account initialized</strong>
                      <small>
                        Account setup belongs to the same user action
                      </small>
                    </div>
                  </div>
                )}
              </div>
              <div className="transaction-meta">
                <div>
                  <span>
                    {tx.chain === "ethereum"
                      ? "Transaction hash"
                      : "Transaction signature"}
                  </span>
                  <code>{tx.hash}</code>
                </div>
                <div>
                  <span>Confirmed at</span>
                  <strong>{tx.timestamp.slice(11, 19)} UTC</strong>
                </div>
              </div>
            </div>
            {index < s.transactions.length - 1 && (
              <div className="crosschain-label">
                <ArrowDown size={15} />
                <span>
                  {s.id === "mayan"
                    ? "Cross-chain execution · Mayan Finance"
                    : "Same intent · continued execution"}
                </span>
                <Link2 size={13} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="execution-note">
        <ShieldCheck size={18} />
        <p>
          {s.id === "mayan"
            ? "1,000 USDC requested → 998.4 USDC received. The 1.6 USDC difference is modeled as bridge execution costs in this fixture."
            : s.id === "jupiter"
              ? "Actual result: 712.83 USDC, within the 0.50% slippage tolerance. The original quote was 715.20 USDC."
              : s.id === "raydium"
                ? "Two outgoing tokens and one incoming LP token are three movements belonging to one ADD_LIQUIDITY action."
                : "The setup transaction and the deposit transaction create one lending position. Receipt units are not a second unrelated deposit."}
        </p>
      </div>
      <NextCard
        label="Confirmed execution matched. The evidence is ready to become a semantic record."
        button="Generate semantic record"
        onNext={onNext}
      />
    </>
  );
}
