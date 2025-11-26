import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../../utils/database";
import { CoinData, Write } from "../../utils/dbInterfaces";
import { getCurrentUnixTimestamp } from "../../../utils/date";
import { getApi } from "../../utils/sdk";

const sdk = require("@defillama/sdk");
const vaultAbi = require("./vault.abi.json");

interface Market {
  address: string;
  symbol: string;
  // decimals: number;
  underlying: string;
  sharePrice: number;
}

async function getEulerV2Tokens(
  chain: string,
  timestamp: number,
  factory: string,
  fromBlock: number
): Promise<Market[]> {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const threeDaysAgo = t - 3 * 24 * 60 * 60;
  const api = await getApi(chain, t, true);
  const threeDaysAgoApi = await getApi(chain, threeDaysAgo, true);
  const toBlock = Number(api.block);

  // Fetch all pools from factory events
  const vaultDeploys = await api.getLogs({
    target: factory,
    fromBlock: fromBlock,
    toBlock,
    topics: [
      "0x04e664079117e113faa9684bc14aecb41651cbf098b14eda271248c6d0cda57c",
    ],
    eventAbi:
      "event ProxyCreated(address indexed proxy, bool upgradeable, address implementation, bytes trailingData)",
  });

  const vaultAddresses = vaultDeploys.map((vaultDeploy: any) => {
    return vaultDeploy.args[0]; // proxy
  });

  const [
    assets,
    sharePrice,
    symbols,
    dTokens,
    currentAmounts,
    previousAmounts,
  ] = await Promise.all([
    api.multiCall({
      calls: vaultAddresses.map((address: any) => ({
        target: address,
        params: [],
      })),
      abi: vaultAbi.find((m: any) => m.name === "asset"),
      permitFailure: true,
    }),
    api.multiCall({
      calls: vaultAddresses.map((address: any) => ({
        target: address,
        params: [sdk.util.convertToBigInt(1e18).toString()],
      })),
      abi: vaultAbi.find((m: any) => m.name === "convertToAssets"),
      permitFailure: true,
    }),
    api.multiCall({
      calls: vaultAddresses.map((address: any) => ({
        target: address,
        params: [],
      })),
      abi: vaultAbi.find((m: any) => m.name === "symbol"),
      permitFailure: true,
    }),
    api.multiCall({
      calls: vaultAddresses.map((address: any) => ({
        target: address,
        params: [],
      })),
      abi: vaultAbi.find((m: any) => m.name === "dToken"),
      permitFailure: true,
    }),
    api.multiCall({
      calls: vaultAddresses.map((address: any) => ({
        target: address,
      })),
      abi: vaultAbi.find((m: any) => m.name === "totalAssets"),
      permitFailure: true,
    }),
    threeDaysAgoApi.multiCall({
      calls: vaultAddresses.map((address: any) => ({
        target: address,
      })),
      abi: vaultAbi.find((m: any) => m.name === "totalAssets"),
      permitFailure: true,
    }),
  ]);

  const [currentCashBalances, previousCashBalances] = await Promise.all([
    api.multiCall({
      calls: vaultAddresses.map((params: any, i: number) => ({
        target: assets[i],
        params,
      })),
      abi: "erc20:balanceOf",
      permitFailure: true,
    }),
    threeDaysAgoApi.multiCall({
      calls: vaultAddresses.map((params: any, i: number) => ({
        target: assets[i],
        params,
      })),
      abi: "erc20:balanceOf",
      permitFailure: true,
    }),
  ]);

  const marketData = assets.map((underlying: any, i: number) => {
    return {
      address: vaultAddresses[i],
      underlying,
      symbol: symbols[i],
      sharePrice: sharePrice[i] / 1e18,
      dToken: dTokens[i],
      currentAmount: currentAmounts[i],
      currentCash: currentCashBalances[i],
      previousAmount: previousAmounts[i],
      previousCash: previousCashBalances[i],
    };
  });

  return marketData;
}

function formWrites(
  markets: Market[],
  underlyingPrices: { [key: string]: CoinData },
  chain: string,
  timestamp: number
) {
  const writes: Write[] = [];
  markets.map((m: any) => {
    const coinData: CoinData | undefined =
      underlyingPrices[m.underlying.toLowerCase()];
    const rate = m.sharePrice;
    if (coinData == null || rate == null || !m.currentAmount) return;

    const tvl = (m.currentAmount * coinData.price) / 10 ** coinData.decimals;
    if (tvl < 1e5) return; // filtering out small markets

    const eTokenPrice: number = coinData.price * rate;

    if (eTokenPrice == 0) return;

    if (
      m.currentCash / m.currentAmount < 0.01 &&
      m.previousCash / m.previousAmount < 0.01
    ) {
      console.log(
        `Bad debt in vault ${m.address} on ${chain}: ${(
          (m.currentCash / m.currentAmount) *
          100
        ).toFixed(2)}% liquidity`
      );

      addToDBWritesList(
        writes,
        chain,
        m.address,
        0,
        coinData.decimals,
        `${m.symbol}`,
        timestamp,
        "euler",
        1.01
      );
    } else {
      addToDBWritesList(
        writes,
        chain,
        m.address,
        eTokenPrice,
        coinData.decimals,
        `${m.symbol}`,
        timestamp,
        "euler",
        0.9
      );
    }

    addToDBWritesList(
      writes,
      chain,
      m.dToken,
      coinData.price * -1,
      coinData.decimals,
      `${m.symbol}-DEBT`,
      timestamp,
      "euler",
      0.9
    );
  });

  return writes;
}

export default async function getEulerV2TokenPrices(
  chain: string,
  timestamp: number,
  factory: string,
  fromBlock: number
) {
  const eulerV2Tokens = await getEulerV2Tokens(
    chain,
    timestamp,
    factory,
    fromBlock
  );

  const underlyingPrices = await getTokenAndRedirectDataMap(
    eulerV2Tokens.map((m: Market) => m.underlying),
    chain,
    timestamp
  );

  return formWrites(eulerV2Tokens, underlyingPrices, chain, timestamp);
}
