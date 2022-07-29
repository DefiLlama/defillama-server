const abi = require("./abi.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { write } from "../../utils/dbInterfaces";
import { result } from "../../utils/sdkInterfaces";
import { listUnknownTokens } from "../../utils/erc20";
import getBlock from "../../utils/block";

async function getReserveData(
  chain: string,
  block: number | undefined,
  registry: string,
  version: string
) {
  const addressProvider = (
    await call({
      target: registry,
      chain: chain as any,
      abi: abi.getAddressesProviderList,
      block
    })
  ).output;
  const lendingPool = (
    await call({
      target: addressProvider[0],
      chain: chain as any,
      abi: abi.getPool[version.toLowerCase()],
      block
    })
  ).output;
  const reservesList = (
    await call({
      target: lendingPool,
      chain: chain as any,
      abi: abi.getReservesList,
      block
    })
  ).output;
  return (
    await multiCall({
      calls: reservesList.map((r: string) => ({
        target: lendingPool,
        params: [r]
      })),
      abi: abi.getReserveData[version.toLowerCase()],
      chain: chain as any,
      block
    })
  ).output;
}
let unknownTokens: string[] = [];

export default async function getTokenPrices(
  chain: string,
  registry: string,
  version: string,
  timestamp: number = 0
) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const reserveData: result[] = await getReserveData(
    chain,
    block,
    registry,
    version
  );

  const [underlyingRedirects, tokenInfo] = await Promise.all([
    getTokenAndRedirectData(
      reserveData.map((r: result) => {
        return r.input.params[0].toLowerCase();
      }),
      chain,
      timestamp
    ),
    getTokenInfo(
      chain,
      reserveData.map((r: result) => r.output.aTokenAddress),
      block
    )
  ]);

  let writes: write[] = [];
  reserveData.map((r, i) => {
    try {
      addToDBWritesList(
        writes,
        chain,
        r.output.aTokenAddress.toLowerCase(),
        undefined,
        tokenInfo.decimals[i].output,
        tokenInfo.symbols[i].output,
        timestamp,
        underlyingRedirects.filter((u) =>
          u.dbEntry.PK.includes(r.input.params[0].toLowerCase())
        )[0].redirect[0].PK
      );
    } catch {
      unknownTokens.push(r.input.params[0].toLowerCase());
    }
  });

  await listUnknownTokens(chain, unknownTokens, block);
  return writes;
}
