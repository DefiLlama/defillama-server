import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { Write, CoinData } from "../../utils/dbInterfaces";
import axios from "axios";
import { multiCall } from "@defillama/sdk/build/abi";
const abi = require("./abi.json");
import getBlock from "../../utils/block";
import { BigNumber } from "ethers";
import { Result } from "../../utils/sdkInterfaces";

interface Market {
  address: string;
  symbol: string;
  decimals: number;
  underlying: string;
}
const chainIds: { [chain: string]: number } = {
  ethereum: 1
};
async function fetchFromIpfs(chain: string) {
  return (
    await axios.get(
      "https://gateway.ipfs.io/ipns/k51qzi5uqu5dhglpppd2ls4cc7mu34ik70ecsvfdyahjipjcuj03lw8iz8rvqm/EulerMarketViews.json",
      {
        headers: {
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1"
        }
      }
    )
  ).data.markets
    .filter((m: any) => m.chainId == chainIds[chain])
    .map((m: any) => ({
      address: m.eTokenAddr,
      symbol: m.symbol,
      decimals: m.decimals,
      underlying: m.underlying
    }));
}
function formWrites(
  markets: Market[],
  underlyingPrices: CoinData[],
  rates: Result[],
  chain: string,
  timestamp: number
) {
  const writes: Write[] = [];
  markets.map((m: any) => {
    const coinData: CoinData | undefined = underlyingPrices.find(
      (c: CoinData) => c.address == m.underlying.toLowerCase()
    );

    const rate: Result | undefined = rates.find(
      (r: Result) => r.input.target == m.address
    );
    if (coinData == null || rate == null) return;
    const eTokenPrice: number =
      (coinData.price * rate.output) / 10 ** m.decimals;

    if (eTokenPrice == 0) return;

    addToDBWritesList(
      writes,
      chain,
      m.address,
      eTokenPrice,
      18,
      `e${m.symbol}`,
      timestamp,
      "euler",
      0.9
    );
  });

  return writes;
}
export default async function getTokenPrices(
  chain: string,
  timestamp: number = 0
) {
  let block: number | undefined;
  let markets: Market[];
  [block, markets] = await Promise.all([
    getBlock(chain, timestamp),
    await fetchFromIpfs(chain)
  ]);

  let underlyingPrices: CoinData[];
  let rates: Result[];
  [underlyingPrices, { output: rates }] = await Promise.all([
    getTokenAndRedirectData(
      markets.map((m: Market) => m.underlying),
      chain,
      timestamp
    ),
    multiCall({
      abi: abi.convertBalanceToUnderlying,
      calls: markets.map((m: Market) => ({
        target: m.address,
        params: [BigNumber.from(10).pow(BigNumber.from(18)).toString()]
      })),
      chain: chain as any,
      block,
    })
  ]);

  return formWrites(markets, underlyingPrices, rates, chain, timestamp);
}
