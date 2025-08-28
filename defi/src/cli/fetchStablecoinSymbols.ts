import { stablecoins } from "../getProtocols";

async function main() {
  const { peggedAssets } = await fetch("https://stablecoins.llama.fi/stablecoins").then((r) => r.json());

  const symbols = peggedAssets.map((s: any) => s.symbol);

  const allSymbols = [...new Set([...symbols, ...stablecoins].map((t) => t.toUpperCase()))];

  console.log(allSymbols);
}

main(); // ts-node defi/src/cli/fetchStablecoinSymbols.ts

// For updating defi/src/getProtocols.ts
