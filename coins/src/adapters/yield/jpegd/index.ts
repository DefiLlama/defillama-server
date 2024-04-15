const abi = require("./abi.json");
import { addToDBWritesList } from "../../utils/database";
import { CoinData, DbTokenInfos, Write } from "../../utils/dbInterfaces";
import { MultiCallResults, Result } from "../../utils/sdkInterfaces";
import { multiCall } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import { getTokenInfo } from "../../utils/erc20";
import { getTokenAndRedirectData } from "../../utils/database";

const gauges: string[] = [
  "0x56d1b6ac326e152c9faad749f1f4f9737a049d46",
  "0xf6cbf5e56a8575797069c7a7fbed218adf17e3b2",
];

async function main(timestamp: number) {
  const writes: Write[] = [];
  const chain: any = "ethereum";
  let tokens: string[];
  let assets: number[];
  let info: DbTokenInfos;

  const block: number | undefined = await getBlock(chain, timestamp);

  [tokens, assets, info] = await Promise.all([
    multiCall({
      calls: gauges.map((g: string) => ({
        target: g,
      })),
      abi: abi.token,
      chain,
      block,
    }).then((m: MultiCallResults) =>
      m.output.map((o: Result) => o.output.toLowerCase()),
    ),
    multiCall({
      calls: gauges.map((g: string) => ({
        target: g,
      })),
      abi: abi.totalAssets,
      chain,
      block,
    }).then((m: MultiCallResults) => m.output.map((o: Result) => o.output)),
    getTokenInfo(chain, gauges, block, {
      withSupply: true,
      timestamp,
    }),
  ]);

  const data: CoinData[] = await getTokenAndRedirectData(
    tokens,
    chain,
    timestamp,
  );

  data.map((d: CoinData) => {
    const index = tokens.find((t: string) => t.toLowerCase() == d.address);
    if (index == null) return;

    const i: number = tokens.indexOf(index);
    const price: number = (d.price * assets[i]) / info.supplies[i].output;

    addToDBWritesList(
      writes,
      chain,
      gauges[i],
      price,
      d.decimals,
      d.symbol,
      timestamp,
      "jpegd",
      d.confidence == null ? 0.9 : d.confidence,
    );
  });

  return writes;
}

export function jpegd(timestamp: number = 0) {
  console.log("starting jpegd");
  return main(timestamp);
}
