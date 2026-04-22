import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import fetch from "node-fetch";

const feeds: { symbol: string; chain: string; address: string; label?: string; decimals: number }[] = [
  { symbol: "BCAP_FUNDAMENTAL", chain: "era", address: "0x57fD71a86522Dc06D6255537521886057c1772A3", label: "BCAP", decimals: 2 },
];

type RedstonePrice = {
  symbol: string;
  value: number;
  timestamp: number;
};

export default async function redstone(timestamp: number = 0) {
  const writes: Write[] = [];
  const now = Date.now();
  const toTimestamp = timestamp === 0 ? now : timestamp * 1000;
  const fromTimestamp = toTimestamp - 60 * 60 * 1000; // 1 hour window
  const interval = 60000;

  for (const feed of feeds) {
    const url = `https://api.redstone.finance/prices?symbol=${feed.symbol}&forceInflux=true&fromTimestamp=${fromTimestamp}&toTimestamp=${toTimestamp}&interval=${interval}`;
    const res: RedstonePrice[] = await fetch(url).then((r) => r.json());
    if (!res.length) continue;

    const latest = res[res.length - 1];
    if (!latest.value) continue;

    const label = feed.label ?? feed.symbol;
    addToDBWritesList(
      writes,
      feed.chain,
      feed.address,
      latest.value,
      feed.decimals,
      label,
      timestamp,
      "redstone",
      0.9,
    );
  }

  return writes;
}