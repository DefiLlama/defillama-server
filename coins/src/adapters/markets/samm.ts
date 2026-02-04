import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { getCurrentUnixTimestamp } from "../../utils/date";

const lps: { [chain: string]: string[] } = {
  scroll: ["0xb0a7cB220b586d4AE97133Eff3d22e1C8559099C"],
};

async function getTokenPrices(chain: any, timestamp: number) {
  const api = await getApi(
    chain,
    timestamp == 0 ? getCurrentUnixTimestamp() : timestamp,
  );

  const [token0s, token1s, supplies, symbols, reserve0s, reserve1s] =
    await Promise.all([
      api.multiCall({
        abi: "address:token0",
        calls: lps[chain].map((target) => ({ target })),
      }),
      api.multiCall({
        abi: "address:token1",
        calls: lps[chain].map((target) => ({ target })),
      }),
      api.multiCall({
        abi: "uint256:totalSupply",
        calls: lps[chain].map((target) => ({ target })),
      }),
      api.multiCall({
        abi: "string:symbol",
        calls: lps[chain].map((target) => ({ target })),
      }),
      api.multiCall({
        abi: "uint256:reserve0",
        calls: lps[chain].map((target) => ({ target })),
      }),
      api.multiCall({
        abi: "uint256:reserve1",
        calls: lps[chain].map((target) => ({ target })),
      }),
    ]);

  const coinData = await getTokenAndRedirectDataMap(
    [...token0s, ...token1s],
    chain,
    timestamp,
  );

  const writes: Write[] = [];
  const decimals = 18;
  lps[chain].forEach((address: string, i: number) => {
    const t0Data = coinData[token0s[i].toLowerCase()];
    const t1Data = coinData[token1s[i].toLowerCase()];
    if (!t0Data || !t1Data) return;

    const t0Value = (t0Data.price * reserve0s[i]) / 10 ** t0Data.decimals;
    const t1Value = (t1Data.price * reserve1s[i]) / 10 ** t1Data.decimals;
    const price = (t0Value + t1Value) / (supplies[i] / 10 ** decimals);
    const t0confidence = t0Data.confidence ?? 0.8;
    const t1confidence = t1Data.confidence ?? 0.8;
    const confidence =
      t0confidence < t1confidence ? t0confidence : t1confidence;

    if (isNaN(price)) return;

    addToDBWritesList(
      writes,
      chain,
      address,
      price,
      decimals,
      symbols[i],
      timestamp,
      "samm",
      confidence,
    );
  });

  return writes;
}

export const samm = (t: number = 0) =>
  Promise.all(Object.keys(lps).map((c) => getTokenPrices(c, t)));
