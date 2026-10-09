import type {
  Chain,
  LedgerProvider,
  OnchainTransaction,
  Scenario,
  SemanticActionType,
} from "./types.ts";
export const EVM_WALLET = "0x7A42d91F6c0B5e238D14a8E72f3C90b6A15D4e29";
export const SOL_WALLET = "7YzK8sG4rPq3mVx9aB2cD6eF1hJ5nR8tW4uX7kL9pQ2s";
const evmHash =
  "0x9b3e7c4a28d165f0e8b6c9a1427d50e3f61a8b924c0d7e5f38a6b219d4c07e85";
// Synthetic base58-encoded 64-byte signatures. These are not signed or submitted transactions.
const solHashes = [
  "5csU9nj9nKuXQZsWst8HKtgEUzAjxCDa6xXAvck4VwyBWNe21PvdBvTDqcoSHqJw4yykTwxvwZxror5TmFbqHyF6",
  "ddo7rX5UwN6Aj26tyHwaQQ29xtCoSwtu51e2HmHFPJHPtSr4fNkWhjkkySbLdYmRCvvwYtWVDEHbafwWpaRzpdQ",
  "5zvJ75rHrGX2qpSToKPRqidVUB6T3aMcnbDvgC9DPpjE9vNfemmkjB2qr3VBkd2yEEPKsMBN8C8yk9cX1bM5JtnV",
  "3X1mGxqvGcSXrNpYtu2L3JgeWg4hGfmFyywrpcZ14mHBL8rYnbm8qt2gH61doLbd6mhNatExf199bQaiGr8QEmXH",
  "4UCwMUs9BUwkfn17MHiSksh5Qb1ZM2qfkfQDYsSYmA3Gk4dTF5JsVJ5S3w4zsAxYhnyjP1QxFA57LjZJRYCWN8uc",
  "2kC3rK5yqxhDrx2926vfdrSsXJnT7uL5UcqP21MunshyBpbDMBLrsvLGKLAjjgskDM4FmjvGYBuwej6mHrpP3ecu",
];
function createScenario(
  config: Omit<Scenario, "intent" | "walletRequest" | "transactions"> & {
    action: SemanticActionType;
    protocol: string;
    origin: string;
    parameters: Record<string, string>;
    target: string;
    payload: string;
    txs: {
      chain: Chain;
      description: string;
      assetChanges: OnchainTransaction["assetChanges"];
    }[];
    offset: number;
  },
): Scenario {
  const wallet = config.sourceChain === "ethereum" ? EVM_WALLET : SOL_WALLET;
  const timestamp = `2026-10-08T14:${String(32 - config.offset).padStart(2, "0")}:08Z`;
  return {
    id: config.id,
    shortName: config.shortName,
    subtitle: config.subtitle,
    color: config.color,
    sourceChain: config.sourceChain,
    destinationChain: config.destinationChain,
    inputAsset: config.inputAsset,
    outputAsset: config.outputAsset,
    requestedAmount: config.requestedAmount,
    receivedAmount: config.receivedAmount,
    expectedAmount: config.expectedAmount,
    position: config.position,
    intent: {
      id: `intent-${config.id}`,
      action: config.action,
      protocol: config.protocol,
      origin: config.origin,
      wallet,
      timestamp,
      parameters: config.parameters,
    },
    walletRequest: {
      id: `req-${config.id}-001`,
      intentId: `intent-${config.id}`,
      chain: config.sourceChain,
      wallet,
      timestamp: timestamp.replace(":08Z", ":12Z"),
      target: config.target,
      method:
        config.sourceChain === "ethereum"
          ? "eth_sendTransaction"
          : "signAndSendTransaction",
      payloadSummary: config.payload,
    },
    transactions: config.txs.map((tx, index) => ({
      ...tx,
      id: `tx-${config.id}-${index + 1}`,
      intentId: `intent-${config.id}`,
      walletRequestId: `req-${config.id}-001`,
      hash:
        tx.chain === "ethereum"
          ? evmHash
          : solHashes[config.offset + index - (config.id === "mayan" ? 1 : 0)],
      status: "confirmed",
      timestamp: timestamp.replace(":08Z", `:${index === 0 ? "24" : "48"}Z`),
    })),
    humanReadableSummary: config.humanReadableSummary,
  };
}
export const scenarios: Scenario[] = [
  createScenario({
    id: "mayan",
    shortName: "Mayan",
    subtitle: "Cross-chain bridge",
    color: "#7057d9",
    action: "BRIDGE",
    protocol: "Mayan Finance",
    origin: "mayan.finance",
    sourceChain: "ethereum",
    destinationChain: "solana",
    inputAsset: "USDC",
    outputAsset: "USDC",
    requestedAmount: "1000",
    receivedAmount: "998.4",
    expectedAmount: "998.4",
    parameters: {
      source: "Ethereum",
      destination: "Solana",
      amount: "1,000 USDC",
      destinationWallet: SOL_WALLET,
      slippage: "0.50%",
    },
    target: "0x8B7d4cA39E62f150a3D87b9C2e4A605F18dB7c93",
    payload:
      "Bridge 1,000 USDC to the Solana destination wallet. Minimum received: 993.408 USDC.",
    txs: [
      {
        chain: "ethereum",
        description: "Contract interaction · USDC outgoing",
        assetChanges: [{ asset: "USDC", amount: "1000", direction: "out" }],
      },
      {
        chain: "solana",
        description: "Token transfer · USDC incoming",
        assetChanges: [{ asset: "USDC", amount: "998.4", direction: "in" }],
      },
    ],
    offset: 0,
    humanReadableSummary:
      "Bridged 1,000 USDC from Ethereum to Solana via Mayan Finance and received 998.4 USDC.",
  }),
  createScenario({
    id: "jupiter",
    shortName: "Jupiter",
    subtitle: "Token swap",
    color: "#27866a",
    action: "SWAP",
    protocol: "Jupiter",
    origin: "jup.ag",
    sourceChain: "solana",
    destinationChain: "solana",
    inputAsset: "SOL",
    outputAsset: "USDC",
    requestedAmount: "5",
    receivedAmount: "712.83",
    expectedAmount: "715.20",
    parameters: {
      amount: "5 SOL",
      outputAsset: "USDC",
      slippage: "0.50%",
      minimumReceived: "711.624 USDC",
      route: "SOL → USDC",
    },
    target: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    payload:
      "Swap 5 SOL for USDC. Slippage tolerance: 0.50%. Minimum output: 711.624 USDC.",
    txs: [
      {
        chain: "solana",
        description: "Routed swap · two token movements",
        assetChanges: [
          { asset: "SOL", amount: "5", direction: "out" },
          { asset: "USDC", amount: "712.83", direction: "in" },
        ],
      },
    ],
    offset: 1,
    humanReadableSummary:
      "Swapped 5 SOL for 712.83 USDC via Jupiter with a 0.50% slippage tolerance.",
  }),
  createScenario({
    id: "kamino",
    shortName: "Kamino",
    subtitle: "Lending deposit",
    color: "#4d78c2",
    action: "DEPOSIT",
    protocol: "Kamino",
    origin: "kamino.finance",
    sourceChain: "solana",
    destinationChain: "solana",
    inputAsset: "USDC",
    outputAsset: "kUSDC",
    requestedAmount: "1000",
    receivedAmount: "985.22",
    expectedAmount: "985.22",
    position:
      "Kamino USDC lending reserve · 985.22 kUSDC receipt units · 1,000 USDC supplied · no borrow",
    parameters: {
      amount: "1,000 USDC",
      market: "USDC lending reserve",
      position: "Supply / no borrow",
    },
    target: "KLend2g3cP87ber41G5jM8bDTmW5sRtN3xQ6uV9aY1Z",
    payload:
      "Initialize a supply position and deposit 1,000 USDC. Receive 985.22 kUSDC receipt units (demo exchange rate).",
    txs: [
      {
        chain: "solana",
        description: "Initialize lending position",
        assetChanges: [],
      },
      {
        chain: "solana",
        description: "Deposit USDC · mint receipt units",
        assetChanges: [
          { asset: "USDC", amount: "1000", direction: "out" },
          { asset: "kUSDC", amount: "985.22", direction: "in" },
        ],
      },
    ],
    offset: 2,
    humanReadableSummary:
      "Deposited 1,000 USDC into the Kamino USDC lending reserve and received 985.22 kUSDC receipt units.",
  }),
  createScenario({
    id: "raydium",
    shortName: "Raydium",
    subtitle: "Liquidity provision",
    color: "#b77940",
    action: "ADD_LIQUIDITY",
    protocol: "Raydium",
    origin: "raydium.io",
    sourceChain: "solana",
    destinationChain: "solana",
    inputAsset: "USDC + SOL",
    outputAsset: "LP units",
    requestedAmount: "500 USDC + 3.5 SOL",
    receivedAmount: "41.82",
    expectedAmount: "41.82",
    position: "SOL / USDC pool · 41.82 LP units · 500 USDC + 3.5 SOL deposited",
    parameters: {
      amount: "500 USDC + 3.5 SOL",
      pool: "SOL / USDC",
      slippage: "0.50%",
      result: "41.82 LP units",
    },
    target: "CPMMoo8L3F4NbTegBCKVN7u8V9jX2hP6qR1sW5yZ3aD",
    payload:
      "Create LP token account, deposit 500 USDC and 3.5 SOL into SOL / USDC pool, mint LP units.",
    txs: [
      {
        chain: "solana",
        description: "Initialize LP token account",
        assetChanges: [],
      },
      {
        chain: "solana",
        description: "Add liquidity · three token movements",
        assetChanges: [
          { asset: "USDC", amount: "500", direction: "out" },
          { asset: "SOL", amount: "3.5", direction: "out" },
          { asset: "LP units", amount: "41.82", direction: "in" },
        ],
      },
    ],
    offset: 4,
    humanReadableSummary:
      "Added 500 USDC and 3.5 SOL to the Raydium SOL / USDC pool and received 41.82 LP units.",
  }),
];
export const fixtureProvider: LedgerProvider = {
  async getScenarios() {
    return structuredClone(scenarios);
  },
};
