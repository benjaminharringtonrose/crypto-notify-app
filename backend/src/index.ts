import cors from "cors";
import express from "express";
import dotenv from "dotenv";

import {
  MONAD_SMART_MONEY_WALLETS,
  MONAD_SMART_TRADER_WALLETS,
} from "./smartWallets";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Default to public Monad RPC; you can override with MONAD_RPC_URL in .env
const MONAD_RPC_URL = process.env.MONAD_RPC_URL ?? "https://rpc.monad.xyz";

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  "1h": 60 * 60,
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

type WalletBalanceSummary = {
  address: string;
  startMon: string;
  endMon: string;
  deltaMon: string;
  percentChange: number | null;
};

type CohortBalances = {
  wallets: WalletBalanceSummary[];
  averagePercentChange: number | null;
};

async function getBalanceAt(
  address: string,
  blockNumber: number
): Promise<bigint> {
  const hexBlock = `0x${blockNumber.toString(16)}`;
  const balanceHex = await jsonRpc<string>({
    jsonrpc: "2.0",
    id: 2,
    method: "eth_getBalance",
    params: [address, hexBlock],
  });
  return BigInt(balanceHex);
}

function formatMon(wei: bigint): string {
  const decimals = 18n;
  const precision = 4n;
  const factor = 10n ** precision; // 10^4 for 4 decimal places
  const scaled = (wei * factor) / 10n ** decimals;
  const integer = scaled / factor;
  const fractional = scaled % factor;
  return `${integer.toString()}.${fractional.toString().padStart(4, "0")}`;
}

async function aggregateFlows(
  wallets: string[],
  timeRange: string
): Promise<CohortBalances> {
  const latest = await getLatestBlockNumber();
  const seconds = RANGE_SECONDS[timeRange] ?? RANGE_SECONDS["24h"];
  const span = Math.floor(seconds / SECONDS_PER_BLOCK);
  const startBlock = Math.max(latest - span, 0);

  let requestCount = 0;
  let sumPctTimes100 = 0n;
  let pctCount = 0n;

  const walletSummaries: WalletBalanceSummary[] = [];

  for (const wallet of wallets) {
    try {
      const [startBal, endBal] = await Promise.all([
        getBalanceAt(wallet, startBlock),
        getBalanceAt(wallet, latest),
      ]);

      requestCount += 2;
      if (requestCount % 25 === 0) {
        console.log("25 RPC requests made. Sleeping for 1 second.");
        await sleep(1000);
      }

      const delta = endBal - startBal;

      let percentChange: number | null = null;
      if (startBal !== 0n && delta !== 0n) {
        const pctTimes100 = (delta * 10000n) / startBal; // hundredth-percent
        sumPctTimes100 += pctTimes100;
        pctCount += 1n;
        percentChange = Number(pctTimes100) / 100;
      }

      walletSummaries.push({
        address: wallet,
        startMon: formatMon(startBal),
        endMon: formatMon(endBal),
        deltaMon: formatMon(delta),
        percentChange,
      });
    } catch (err) {
      console.warn(`Failed to fetch balances for wallet ${wallet}:`, err);
    }
  }

  let averagePercentChange: number | null = null;
  if (pctCount > 0n) {
    averagePercentChange = Number(sumPctTimes100 / pctCount) / 100;
  }

  return { wallets: walletSummaries, averagePercentChange };
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
      source: "monad_rpc_balances",
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
