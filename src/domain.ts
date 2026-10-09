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
