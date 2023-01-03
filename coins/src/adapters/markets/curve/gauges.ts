const abi = require("./abi.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { Write, CoinData } from "../../utils/dbInterfaces";
import { getTokenInfo } from "../../utils/erc20";

async function mainGauges(chain: any, block: number | undefined) {
  const target: string = "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB";
  const gaugeCount = (
    await call({
      target,
      chain,
      abi: abi.n_gauges,
    })
  ).output;
  let calls = [];
  for (var i = 0; i < gaugeCount; i++) {
    calls.push({
      params: [i],
      target,
    });
  }

  const gaugesListRes = await multiCall({
    chain,
    calls,
    abi: abi.gauges,
    block,
  });

  return gaugesListRes.output.map((res: any) => res.output);
}
async function childGauges(chain: string, block: number | undefined) {
  const target: string = "0xabC000d88f23Bb45525E447528DBF656A9D55bf5";
  const gaugeCount = (
    await call({
      target,
      chain,
      abi: abi.get_gauge_count,
    })
  ).output;
  let calls = [];
  for (var i = 0; i < gaugeCount; i++) {
    calls.push({
      params: [i],
      target,
    });
  }

  const gaugesListRes = await multiCall({
    chain,
    calls,
    abi: abi.get_gauge,
    block,
  });

  return gaugesListRes.output.map((res: any) => res.output);
}
async function getGauges(chain: string, block: number | undefined) {
  if (chain == "ethereum") return await mainGauges(chain, block);
  return await childGauges(chain, block);
}
async function getUnderlyings(
  chain: string,
  block: number | undefined,
  gaugeAddresses: string[],
) {
  return (
    await multiCall({
      chain: chain as any,
      calls: gaugeAddresses.map((a: any) => ({
        target: a,
      })),
      abi: abi.lp_token,
      block,
    })
  ).output.map((c: any) => c.output);
}
export default async function getTokenPrices(
  chain: string,
  timestamp: number = 0,
) {
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);
  const gaugeAddresses: string[] = await getGauges(chain, block);
  const getUnderlyingAddresses = await getUnderlyings(
    chain,
    block,
    gaugeAddresses,
  );

  const successfulCallResults: any[] = [];
  getUnderlyingAddresses.map((c: string, i: number) => {
    if (c == null) return;
    successfulCallResults.push({
      gauge: gaugeAddresses[i],
      lp: c,
    });
  });

  const tokenInfos = await getTokenInfo(
    chain,
    successfulCallResults.map((c: any) => c.gauge),
    block,
  );

  const tokenAndRedirectData = await getTokenAndRedirectData(
    successfulCallResults.map((c: any) => c.lp.toLowerCase()),
    chain,
    timestamp,
  );

  successfulCallResults.map((c: any, i: number) => {
    const dbEntries = tokenAndRedirectData.filter(
      (e: CoinData) => e.address == c.lp.toLowerCase(),
    );
    if (
      tokenInfos.symbols[i].output == null ||
      tokenInfos.decimals[i].output == null ||
      dbEntries.length == 0
    )
      return;
    addToDBWritesList(
      writes,
      chain,
      c.gauge.toLowerCase(),
      undefined,
      tokenInfos.decimals[i].output,
      tokenInfos.symbols[i].output,
      timestamp,
      "curve-gauges",
      0.8,
      `asset#${chain}:${c.lp.toLowerCase()}`,
    );
  });

  return writes;
}
