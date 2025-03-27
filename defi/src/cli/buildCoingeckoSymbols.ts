import fetch from "node-fetch";
import symbolsA from "../utils/symbols/symbols.json";

type CgData = {
  id: string;
  symbol: string;
};
const symbols: { [id: string]: string } = symbolsA;

async function main() {
  console.log(`old length: ${Object.keys(symbols).length}`);
  const data = await fetch(`https://api.coingecko.com/api/v3/coins/list`).then((r) => r.json());

  data.map((t: CgData) => {
    const { id, symbol } = t;
    if (id in symbols) return;
    symbols[id] = symbol.toUpperCase();
  });

  console.log(`new length: ${Object.keys(symbols).length}`);
  return symbols; // save this to symbols.json
} // ts-node defi/src/cli/buildCoingeckoSymbols.ts
main();
