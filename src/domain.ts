import type { Scenario, SemanticRecord } from "./types.ts";
export function classify(scenario: Scenario): SemanticRecord {
  const { intent, walletRequest, transactions } = scenario;
  if (
    walletRequest.intentId !== intent.id ||
    walletRequest.wallet !== intent.wallet ||
    walletRequest.chain !== scenario.sourceChain ||
    transactions.length === 0 ||
    transactions.some(
      (tx) =>
        tx.intentId !== intent.id || tx.walletRequestId !== walletRequest.id,
    ) ||
    !transactions.some((tx) => tx.chain === scenario.sourceChain) ||
    !transactions.some((tx) => tx.chain === scenario.destinationChain)
  )
    throw new Error("Incomplete evidence correlation");
  const success = transactions.every((tx) => tx.status === "confirmed");
  return {
    id: `record-${scenario.id}`,
    action: intent.action,
    protocol: intent.protocol,
    origin: intent.origin,
    sourceChain: scenario.sourceChain,
    destinationChain: scenario.destinationChain,
    inputAsset: scenario.inputAsset,
    requestedAmount: scenario.requestedAmount,
    receivedAmount: scenario.receivedAmount,
    sourceTransaction: transactions[0].hash,
    ...(scenario.sourceChain !== scenario.destinationChain
      ? { destinationTransaction: transactions[transactions.length - 1].hash }
      : {}),
    status: success ? "SUCCESS" : "FAILED",
    confidence: success ? "HIGH" : "LOW",
    intent,
    walletRequest,
    transactions,
    humanReadableSummary: scenario.humanReadableSummary,
    evidence: [
      "UI Observed",
      "Wallet Request Matched",
      ...(scenario.sourceChain !== scenario.destinationChain
        ? [
            success ? "Source Tx Confirmed" : "Source Tx Checked",
            success ? "Destination Tx Confirmed" : "Destination Tx Checked",
          ]
        : [
            success
              ? "Onchain Execution Confirmed"
              : "Onchain Execution Checked",
          ]),
    ],
    ...(scenario.position ? { position: scenario.position } : {}),
  };
}
export type Screen =
  | "overview"
  | "exceptions"
  | "intent"
  | "wallet"
  | "execution"
  | "record"
  | "resolved";
export const DEMO_STEPS: {
  screen: Screen;
  title: string;
  caption: string;
  duration: number;
}[] = [
  {
    screen: "exceptions",
    title: "Two transactions. No context.",
    caption:
      "Accounting sees an Ethereum outflow and a Solana inflow, but cannot tell why they happened.",
    duration: 6000,
  },
  {
    screen: "exceptions",
    title: "One manual exception.",
    caption:
      "The funds arrived. The meaning did not. A person would normally investigate both transactions.",
    duration: 5000,
  },
  {
    screen: "intent",
    title: "Capture the intent.",
    caption:
      "Before submission, the dApp already knows: bridge 1,000 USDC from Ethereum to Solana via Mayan.",
    duration: 7000,
  },
  {
    screen: "wallet",
    title: "Match the wallet request.",
    caption:
      "The observed action is linked to the exact request sent to the source wallet.",
    duration: 6000,
  },
  {
    screen: "execution",
    title: "Follow execution across chains.",
    caption:
      "The source transaction sends 1,000 USDC. The destination transaction receives 998.4 USDC.",
    duration: 8000,
  },
  {
    screen: "record",
    title: "Give the transaction its meaning.",
    caption:
      "Intent, request and confirmed execution become one evidence-backed BRIDGE record.",
    duration: 8000,
  },
  {
    screen: "resolved",
    title: "Return to the ledger.",
    caption:
      "Two independent transactions are grouped under a single, understandable accounting action.",
    duration: 5000,
  },
  {
    screen: "resolved",
    title: "Exception, resolved.",
    caption:
      "Automatically classified. No manual reconstruction required for this demo action.",
    duration: 7000,
  },
];
export interface DemoState {
  active: boolean;
  playing: boolean;
  step: number;
  elapsed: number;
  completed: boolean;
}
export const initialDemoState: DemoState = {
  active: false,
  playing: false,
  step: 0,
  elapsed: 0,
  completed: false,
};
export type DemoEvent =
  | { type: "PLAY" | "PAUSE" | "NEXT" | "RESTART" }
  | { type: "TICK"; delta: number };
export function demoReducer(state: DemoState, event: DemoEvent): DemoState {
  switch (event.type) {
    case "RESTART":
      return { ...initialDemoState };
    case "PAUSE":
      return { ...state, playing: false };
    case "PLAY":
      return state.completed
        ? { ...initialDemoState, active: true, playing: true }
        : { ...state, active: true, playing: true };
    case "NEXT":
      return state.step >= DEMO_STEPS.length - 1
        ? {
            ...state,
            playing: false,
            completed: true,
            elapsed: DEMO_STEPS[state.step].duration,
          }
        : { ...state, active: true, step: state.step + 1, elapsed: 0 };
    case "TICK": {
      if (!state.playing) return state;
      const elapsed = state.elapsed + event.delta;
      return elapsed >= DEMO_STEPS[state.step].duration
        ? demoReducer(state, { type: "NEXT" })
        : { ...state, elapsed };
    }
  }
}
export function compact(value: string): string {
  return value.length > 22 ? `${value.slice(0, 9)}…${value.slice(-7)}` : value;
}
export function amount(value: string): string {
  return Number.isNaN(Number(value))
    ? value
    : Number(value).toLocaleString("en-US", { maximumFractionDigits: 6 });
}
export function chainName(chain: string): string {
  return chain === "ethereum" ? "Ethereum" : "Solana";
}
