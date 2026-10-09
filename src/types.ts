export type SemanticActionType =
  | "SWAP"
  | "BRIDGE"
  | "DEPOSIT"
  | "WITHDRAW"
  | "ADD_LIQUIDITY"
  | "REMOVE_LIQUIDITY";
export type Chain = "ethereum" | "solana";
export interface AssetChange {
  asset: string;
  amount: string;
  direction: "in" | "out";
}
export interface ObservedIntent {
  id: string;
  action: SemanticActionType;
  protocol: string;
  origin: string;
  wallet: string;
  timestamp: string;
  parameters: Record<string, string>;
}
export interface WalletRequest {
  id: string;
  intentId: string;
  chain: Chain;
  wallet: string;
  timestamp: string;
  payloadSummary: string;
  target: string;
  method: string;
}
export interface OnchainTransaction {
  id: string;
  intentId: string;
  walletRequestId: string;
  chain: Chain;
  hash: string;
  status: "confirmed" | "failed";
  timestamp: string;
  description: string;
  assetChanges: AssetChange[];
}
export interface Scenario {
  id: string;
  shortName: string;
  subtitle: string;
  color: string;
  sourceChain: Chain;
  destinationChain: Chain;
  inputAsset: string;
  outputAsset: string;
  requestedAmount: string;
  receivedAmount: string;
  expectedAmount: string;
  position?: string;
  intent: ObservedIntent;
  walletRequest: WalletRequest;
  transactions: OnchainTransaction[];
  humanReadableSummary: string;
}
export interface SemanticRecord {
  id: string;
  action: SemanticActionType;
  protocol: string;
  origin: string;
  sourceChain: Chain;
  destinationChain: Chain;
  inputAsset: string;
  requestedAmount: string;
  receivedAmount: string;
  sourceTransaction: string;
  destinationTransaction?: string;
  status: "SUCCESS" | "FAILED";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  intent: ObservedIntent;
  walletRequest: WalletRequest;
  transactions: OnchainTransaction[];
  humanReadableSummary: string;
  evidence: string[];
  position?: string;
}
/** Replace this read-only boundary with RPC/indexer or Semantic Record API adapters. */
export interface LedgerProvider {
  getScenarios(): Promise<Scenario[]>;
}
