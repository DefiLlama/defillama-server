import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import axios from "axios";
import { getCurrentUnixTimestamp, toUNIXTimestamp } from "../../utils/date";

const chain = "sui";
const margin = 60 * 60; // 1 hour

export async function momentum(timestamp: number) {
  if (timestamp != 0) throw new Error("Can't fetch historical data");
  const timestampNow = getCurrentUnixTimestamp();
  const writes: Write[] = [];

  const {
    data: { data: prices },
  } = await axios.get("https://api.mmt.finance/prices");
  const {
    data: { data: tokens },
  } = await axios.get("https://api.mmt.finance/tokens");

  tokens.forEach(({ decimals, ticker, coinType }: any) => {
    const priceData = prices.find((p: any) => p.coinType === coinType);
    if (!priceData) return;
    const { price, timestamp } = priceData;

    const unixTimestamp = toUNIXTimestamp(Date.parse(timestamp));
    if (unixTimestamp < timestampNow - margin) return;

    addToDBWritesList(
      writes,
      chain,
      coinType,
      price,
      decimals,
      ticker,
      0,
      "momentum",
      0.9,
    );
  });

  return writes;
}

momentum(0); // ts-node coins/src/adapters/markets/momentum.ts
