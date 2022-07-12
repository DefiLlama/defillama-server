const abi = require("./abi.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import { batchGet, batchWrite } from "../../../utils/shared/dynamodb";
import { addToDBWritesList } from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { write } from "../../utils/dbInterfaces";
import { result } from "../../utils/sdkInterfaces";

async function getReserveData(chain: string, registry: string) {
  const addressProvider = (
    await call({
      target: registry,
      chain: chain as any,
      abi: abi.getAddressesProviderList
    })
  ).output;
  const lendingPool = (
    await call({
      target: addressProvider[0],
      chain: chain as any,
      abi: abi.getLendingPool
    })
  ).output;
  const reservesList = (
    await call({
      target: lendingPool,
      chain: chain as any,
      abi: abi.getReservesList
    })
  ).output;
  return (
    await multiCall({
      calls: reservesList.map((r: string) => ({
        target: lendingPool,
        params: [r]
      })),
      abi: abi.getReserveData,
      chain: chain as any
    })
  ).output;
}

export async function getTokenPrices(chain: string, registry: string) {
  const reserveData: result[] = await getReserveData(chain, registry);
  const [underlyingRedirects, tokenInfo] = await Promise.all([
    batchGet(
      reserveData.map((r: result) => ({
        PK: `asset#${chain}:${r.input.params[0].toLowerCase()}`,
        SK: 0
      }))
    ),
    getTokenInfo(
      chain,
      reserveData.map((r: result) => r.output.aTokenAddress)
    )
  ]);

  let writes: write[] = [];
  reserveData.map((r, i) =>
    addToDBWritesList(
      writes,
      chain,
      r.output.aTokenAddress.toLowerCase(),
      undefined,
      tokenInfo.decimals[i].output,
      tokenInfo.symbols[i].output,
      underlyingRedirects.filter((u) =>
        u.PK.includes(r.input.params[0].toLowerCase())
      )[0].redirect
    )
  );

  await batchWrite(writes, true);
}
