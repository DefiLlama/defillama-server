const abi = require("./abi.json");
const contracts = require("./contracts.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import { batchGet, batchWrite } from "../../../utils/shared/dynamodb";

async function getReserveData(chain: string) {
  const addressProvider = (
    await call({
      target: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
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
async function getTokenData(chain: string, reserveData: any) {
  return await Promise.all([
    batchGet(
      reserveData.map((r: any) => ({
        PK: `asset#${chain}:${r.input.params[0].toLowerCase()}`,
        SK: 0
      }))
    ),
    await multiCall({
      calls: reserveData.map((r: any) => ({
        target: r.output.aTokenAddress
      })),
      abi: "erc20:decimals",
      chain: chain as any
    })
  ]);
}
export async function getTokenPrices(chain: string) {
  const reserveData = await getReserveData(chain);
  const [underlyingRedirects, { output: decimals }] = await getTokenData(
    chain,
    reserveData
  );

  let writes: any[] = [];
  reserveData.map((r, i) =>
    writes.push(
      {
        redirect: underlyingRedirects.filter((u) =>
          u.PK.includes(r.input.params[0].toLowerCase())
        )[0].redirect,
        decimals: decimals[i].output,
        PK: `asset#${chain}:${r.output.aTokenAddress.toLowerCase()}`,
        SK: Date.now()
      },
      {
        redirect: underlyingRedirects.filter((u) =>
          u.PK.includes(r.input.params[0].toLowerCase())
        )[0].redirect,
        decimals: decimals[i].output,
        PK: `asset#${chain}:${r.output.aTokenAddress.toLowerCase()}`,
        SK: 0
      }
    )
  );

  await batchWrite(writes, true);
}
