import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../utils/block";
import { getBalance } from "@defillama/sdk/build/eth/index";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { getTokenInfo } from "../utils/erc20";

// MIND THIS ONLY SUPPORTS POOL ASSETS OF EQUIVALENT DECIMALS
export default async function getTokenPrices(
  timestamp: number,
  pool: string,
  unknownToken: string,
  knownToken: string,
  knownTokenIsGas: boolean,
  chain: any,
) {
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);

  const [
    gasBalance,
    unknownBalance,
    knownBalance,
    unknownDecimals,
    knownDecimals,
    knownInfo,
    unknownInfo,
  ] = await Promise.all([
    getBalance({
      target: pool,
      block,
      chain,
    }),
    call({
      target: unknownToken,
      params: pool,
      abi: "erc20:balanceOf",
      block,
      chain,
    }),
    call({
      target: knownToken,
      params: pool,
      abi: "erc20:balanceOf",
      block,
      chain,
    }),
    call({
      target: unknownToken,
      abi: "erc20:decimals",
      block,
      chain,
    }),
    call({
      target: knownToken,
      abi: "erc20:decimals",
      block,
      chain,
    }),
    getTokenAndRedirectData([knownToken], chain, timestamp),
    getTokenInfo(chain, [unknownToken], block),
  ]);
  const price: number =
    ((parseInt(knownTokenIsGas ? gasBalance.output : knownBalance.output) *
      10 ** (unknownDecimals.output - knownDecimals.output)) /
      unknownBalance.output) *
    knownInfo[0].price;
  const symbol =
    unknownToken == "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359"
      ? "SAI"
      : unknownInfo.symbols[0].output;

  addToDBWritesList(
    writes,
    chain,
    unknownToken,
    price,
    unknownInfo.decimals[0].output,
    symbol,
    timestamp,
    "unknownTokenRequested",
    0.51,
  );

  return writes;
}
