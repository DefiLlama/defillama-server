const abi = require("./abi.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import { batchGet, batchWrite } from "../../../utils/shared/dynamodb";
import { addToDBWritesList } from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { write } from "../../utils/dbInterfaces";
import { result } from "../../utils/sdkInterfaces";
import { listUnknownTokens } from "../../utils/erc20";

async function getReserveData(
  chain: string,
  registry: string,
  version: string
) {
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
      abi: abi.getPool[version.toLowerCase()]
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
      abi: abi.getReserveData[version.toLowerCase()],
      chain: chain as any
    })
  ).output;
}
let unknownTokens: string[] = [];

async function getTokenPrices(
  chain: string,
  registry: string,
  version: string
) {
  const reserveData: result[] = await getReserveData(chain, registry, version);
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
  reserveData.map((r, i) => {
    try {
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
      );
    } catch {
      unknownTokens.push(r.input.params[0].toLowerCase());
    }
  });

  await listUnknownTokens(chain, unknownTokens);
  await batchWrite(writes, true);
}

export default function factories() {
  //enter();
  getTokenPrices(
    "optimism",
    "0x770ef9f4fe897e59daCc474EF11238303F9552b6",
    "v3"
  );
  getTokenPrices(
    "arbitrum",
    "0x770ef9f4fe897e59daCc474EF11238303F9552b6",
    "v3"
  );
  getTokenPrices(
    "ethereum",
    "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
    "v2"
  );
  // AMM market has no registry
  //getTokenPrices("ethereum", "0x7937d4799803fbbe595ed57278bc4ca21f3bffcb");
  getTokenPrices("polygon", "0x3ac4e9aa29940770aeC38fe853a4bbabb2dA9C19", "v2");
  getTokenPrices("avax", "0x4235E22d9C3f28DCDA82b58276cb6370B01265C2", "v2");
}
