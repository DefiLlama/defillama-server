import fetch from "node-fetch";
import handler from "./getCoinPriceChart";

const PROD_BASE = "https://coins.llama.fi";

const COINS =
  "starknet:0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb,coingecko:ethereum";

// Fixed start so results are deterministic (2024-11-15 00:00:00 UTC)
const FIXED_START = 1731628800;

interface TestCase {
  label: string;
  coins: string;
  qs: Record<string, string>;
}

const testCases: TestCase[] = [
  {
    label: "30 daily points (per-timestamp path — large range, sparse points)",
    coins: COINS,
    qs: { start: String(FIXED_START), span: "30", period: "1d" },
  },
  {
    label: "24 hourly points (borderline — 1 day range)",
    coins: COINS,
    qs: { start: String(FIXED_START), span: "24", period: "1h" },
  },
  {
    label: "12 x 5-min points (range query path — short range)",
    coins: COINS,
    qs: { start: String(FIXED_START), span: "12", period: "5m" },
  },
  {
    label: "7 daily points (per-timestamp path — week range)",
    coins: COINS,
    qs: { start: String(FIXED_START), span: "7", period: "1d" },
  },
  {
    label: "60 x 30-min points (range query path — 30h range)",
    coins: COINS,
    qs: { start: String(FIXED_START), span: "60", period: "30m" },
  },
  {
    label: "single coin, 90 daily points",
    coins: "coingecko:ethereum",
    qs: { start: String(FIXED_START), span: "90", period: "1d" },
  },
];

function buildProdUrl(coins: string, qs: Record<string, string>): string {
  const params = new URLSearchParams(qs).toString();
  return `${PROD_BASE}/chart/${coins}?${params}`;
}

function buildEvent(coins: string, qs: Record<string, string>) {
  return {
    pathParameters: { coins },
    queryStringParameters: { ...qs },
  };
}

type CoinPrices = {
  [coin: string]: {
    prices: { timestamp: number; price: number }[];
    symbol: string;
    decimals?: number;
    confidence?: number;
  };
};

function comparePrices(
  label: string,
  prod: CoinPrices,
  local: CoinPrices,
): { pass: boolean; details: string[] } {
  const details: string[] = [];
  let pass = true;

  const prodKeys = Object.keys(prod).sort();
  const localKeys = Object.keys(local).sort();

  if (prodKeys.join(",") !== localKeys.join(",")) {
    details.push(
      `  coin keys differ — prod: [${prodKeys}] local: [${localKeys}]`,
    );
    pass = false;
  }

  for (const key of prodKeys) {
    if (!local[key]) continue;
    const pp = prod[key].prices;
    const lp = local[key].prices;

    if (pp.length !== lp.length) {
      details.push(
        `  ${key}: price count differs — prod: ${pp.length}, local: ${lp.length}`,
      );
      pass = false;
      continue;
    }

    let mismatches = 0;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].timestamp !== lp[i].timestamp || pp[i].price !== lp[i].price) {
        if (mismatches < 3) {
          details.push(
            `  ${key}[${i}]: prod=(${pp[i].timestamp}, ${pp[i].price}) local=(${lp[i].timestamp}, ${lp[i].price})`,
          );
        }
        mismatches++;
        pass = false;
      }
    }
    if (mismatches > 3) {
      details.push(`  ... and ${mismatches - 3} more mismatches`);
    }
    if (mismatches === 0) {
      details.push(`  ${key}: ${pp.length} prices match`);
    }
  }

  return { pass, details };
}

async function testMaxRecordsLimit(): Promise<boolean> {
  console.log(`\n=== max records limit (should return error) ===`);
  // 6 coins × 100 timestamps = 600 > 500 limit
  const manyCoins = [
    "coingecko:ethereum",
    "coingecko:bitcoin",
    "coingecko:solana",
    "coingecko:cardano",
    "coingecko:polkadot",
    "coingecko:avalanche-2",
  ].join(",");
  try {
    const localRaw = await handler(
      buildEvent(manyCoins, {
        start: String(FIXED_START),
        span: "100",
        period: "1h",
      }) as any,
    );
    if (!localRaw || typeof localRaw === "string") {
      console.log(`  ERROR: handler returned ${localRaw}`);
      return false;
    }
    const body = JSON.parse(localRaw.body);
    if (body.message && body.message.includes("exceeds the maximum")) {
      console.log(`  got expected error: ${body.message}`);
      console.log(`  PASS`);
      return true;
    }
    console.log(`  expected error response, got: ${JSON.stringify(body).slice(0, 200)}`);
    console.log(`  FAIL`);
    return false;
  } catch (err: any) {
    console.log(`  ERROR: ${err.message}`);
    return false;
  }
}

async function run() {
  let passed = 0;
  let failed = 0;

  // Test max records limit first (no DynamoDB or network needed)
  if (await testMaxRecordsLimit()) passed++;
  else failed++;

  for (const tc of testCases) {
    const url = buildProdUrl(tc.coins, tc.qs);
    console.log(`\n=== ${tc.label} ===`);
    console.log(`  prod: ${url}`);

    try {
      const localRaw = await handler(buildEvent(tc.coins, tc.qs) as any);
      if (!localRaw || typeof localRaw === "string") {
        console.log(`  ERROR: handler returned ${localRaw}`);
        failed++;
        continue;
      }
      const [prodRes, localRes] = await Promise.all([
        fetch(url).then((r) => r.json()) as Promise<{ coins: CoinPrices }>,
        Promise.resolve(JSON.parse(localRaw.body)) as Promise<{
          coins: CoinPrices;
        }>,
      ]);

      const { pass, details } = comparePrices(
        tc.label,
        prodRes.coins,
        localRes.coins,
      );
      details.forEach((d) => console.log(d));

      if (pass) {
        console.log(`  PASS`);
        passed++;
      } else {
        console.log(`  FAIL`);
        failed++;
      }
    } catch (err: any) {
      console.log(`  ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
