import fetch from "node-fetch";

type ErrorCompare = { [symbol: string]: { sections: string[]; amounts: string[] } };
async function main() {
  const breakdown = await fetch(`https://api.llama.fi/chain-assets/chains`).then((r) => r.json());
  const errors: { [chain: string]: ErrorCompare } = {};
  let totalDoubleCount: { [chain: string]: number } = {};

  Object.keys(breakdown).map((chain: string) => {
    const chainTokens: ErrorCompare = {};
    Object.keys(breakdown[chain]).map((section: string) => {
      if (section == "total") return;
      const tokens = Object.keys(breakdown[chain][section].breakdown);
      tokens.map((t: string) => {
        if (!(t in chainTokens)) chainTokens[t] = { sections: [], amounts: [] };
        chainTokens[t].sections.push(section);
        chainTokens[t].amounts.push(breakdown[chain][section].breakdown[t]);
      });
    });

    Object.keys(chainTokens).map((symbol: string) => {
      if (chainTokens[symbol].sections.length == 1) return;
      const numberQtys: number[] = chainTokens[symbol].amounts.map((s) => Number(s));
      if (!(chain in totalDoubleCount)) totalDoubleCount[chain] = 0;
      totalDoubleCount[chain] += Math.min(...numberQtys);
      if (Math.min(...numberQtys) < 100000) return;
      if (!(chain in errors)) errors[chain] = {};
      errors[chain][symbol] = chainTokens[symbol];
    });
  });

  return;
}
main(); // ts-node defi/l2/cli/checkForDuplicates.ts
