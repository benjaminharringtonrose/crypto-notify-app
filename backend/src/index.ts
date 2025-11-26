import cors from "cors";
import express from "express";

import {
  MONAD_SMART_MONEY_WALLETS,
  MONAD_SMART_TRADER_WALLETS,
} from "./smartWallets";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Default to public Monad RPC; you can override with MONAD_RPC_URL in .env
const MONAD_RPC_URL = process.env.MONAD_RPC_URL ?? "https://rpc.monad.xyz";

// WMON token on Monad mainnet (wrapped MON) from Monad docs:
// https://docs.monad.xyz/developer-essentials/network-information
const WMON_ADDRESS = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";

// ERC-20 Transfer(address,address,uint256) topic
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown[];
};

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
};

async function jsonRpc<T>(body: JsonRpcRequest): Promise<T> {
  const res = await fetch(MONAD_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`RPC HTTP error ${res.status}`);
  }

  const json = (await res.json()) as JsonRpcResponse<T>;
  if (json.error) {
    throw new Error(`RPC error ${json.error.code}: ${json.error.message}`);
  }
  if (json.result === undefined) {
    throw new Error("RPC response missing result");
  }
  return json.result;
}

async function getLatestBlockNumber(): Promise<number> {
  const hex = await jsonRpc<string>({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_blockNumber",
    params: [],
  });
  return Number.parseInt(hex, 16);
}

// Rough mapping from our timeRange keys to an approximate block span.
// Monad aims for fast blocks; we assume ~2s per block as a starting point.
const RANGE_SECONDS: Record<string, number> = {
  "24h": 24 * 60 * 60,
  "2d": 2 * 24 * 60 * 60,
  "3d": 3 * 24 * 60 * 60,
  "1w": 7 * 24 * 60 * 60,
  "2w": 14 * 24 * 60 * 60,
  "1m": 30 * 24 * 60 * 60,
  "3m": 90 * 24 * 60 * 60,
  "6m": 180 * 24 * 60 * 60,
  "1y": 365 * 24 * 60 * 60,
};

const SECONDS_PER_BLOCK = 2;
const MAX_BLOCK_SPAN = 50_000; // safety cap to avoid massive log scans

type FlowTotals = {
  inflow: bigint;
  outflow: bigint;
};

type LogEntry = {
  topics: string[];
  data: string;
};

function toPaddedAddress(address: string): string {
  return `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
}

async function getWalletFlows(
  wallet: string,
  fromBlock: number,
  toBlock: number
): Promise<FlowTotals> {
  const padded = toPaddedAddress(wallet);

  // Logs where wallet is the recipient (inflow)
  const inflowLogs = await jsonRpc<LogEntry[]>({
    jsonrpc: "2.0",
    id: 2,
    method: "eth_getLogs",
    params: [
      {
        address: WMON_ADDRESS,
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        topics: [TRANSFER_TOPIC, null, padded],
      },
    ],
  });

  // Logs where wallet is the sender (outflow)
  const outflowLogs = await jsonRpc<LogEntry[]>({
    jsonrpc: "2.0",
    id: 3,
    method: "eth_getLogs",
    params: [
      {
        address: WMON_ADDRESS,
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        topics: [TRANSFER_TOPIC, padded],
      },
    ],
  });

  const inflow = inflowLogs.reduce((sum, log) => {
    const amount = BigInt(log.data);
    return sum + amount;
  }, 0n);

  const outflow = outflowLogs.reduce((sum, log) => {
    const amount = BigInt(log.data);
    return sum + amount;
  }, 0n);

  return { inflow, outflow };
}

async function aggregateFlows(
  wallets: string[],
  timeRange: string
): Promise<{ netInflowPercent: number; netOutflowPercent: number }> {
  const latest = await getLatestBlockNumber();
  const seconds = RANGE_SECONDS[timeRange] ?? RANGE_SECONDS["24h"];
  const span = Math.min(
    Math.floor(seconds / SECONDS_PER_BLOCK),
    MAX_BLOCK_SPAN
  );
  const fromBlock = Math.max(latest - span, 0);

  let totalIn = 0n;
  let totalOut = 0n;

  await Promise.all(
    wallets.map(async (wallet) => {
      try {
        const { inflow, outflow } = await getWalletFlows(
          wallet,
          fromBlock,
          latest
        );
        totalIn += inflow;
        totalOut += outflow;
      } catch (err) {
        console.warn(`Failed to fetch flows for wallet ${wallet}:`, err);
      }
    })
  );

  const total = totalIn + totalOut;
  if (total === 0n) {
    return { netInflowPercent: 0, netOutflowPercent: 0 };
  }

  const inflowPct = Number((totalIn * 10000n) / total) / 100;
  const outflowPct = Number((totalOut * 10000n) / total) / 100;

  return { netInflowPercent: inflowPct, netOutflowPercent: outflowPct };
}

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "crypto-notify-backend" });
});

app.get("/api/monad/smart-distribution", async (req, res) => {
  const timeRange = (req.query.timeRange as string) ?? "24h";

  try {
    const [smartMoney, smartTraders] = await Promise.all([
      aggregateFlows(MONAD_SMART_MONEY_WALLETS, timeRange),
      aggregateFlows(MONAD_SMART_TRADER_WALLETS, timeRange),
    ]);

    res.json({
      coin: "MON",
      timeRange,
      cohorts: {
        smartMoney,
        smartTraders,
      },
      source: "monad_rpc",
    });
  } catch (err) {
    console.error("Error computing smart distribution:", err);
    res.status(500).json({
      error: "Failed to compute smart distribution",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
