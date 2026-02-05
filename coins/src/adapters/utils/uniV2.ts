import { ChainApi, cache } from "@defillama/sdk";
import axios from "axios";
import sleep from "../../utils/shared/sleep";
import { Write } from "./dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectDataMap } from "./database";
import { getTokenInfoMap } from "./erc20";

const assetsToTestAgainst: {
  [chain: string]: string[];
} = {
  ethereum: [
    "0xdac17f958d2ee523a2206206994597c13d831ec7",
    "0x0000000000000000000000000000000000000000",
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "0x6b175474e89094c44da98b954eedeac495271d0f"
  ].map((i) => i.toLowerCase()),
  arbitrum: [
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    "0x0fBcbaEA96Ce0cF7Ee00A8c19c3ab6f5Dc8E1921",
    "0x6491c05A82219b8D1479057361ff1654749b876b",
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    "0xdDb46999F8891663a8F2828d25298f70416d7610",
    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  ].map((i) => i.toLowerCase()),
};

const coreAssetsCache: {
  [chain: string]: Set<string>;
} = {};

const MinLiquidity = 50000;
const MinVolume = 1000000;

const maxConfidence = 0.94
function calculateConfidence(value: number, _minLiquidity = MinLiquidity) {
  value = +value;
  if (value <= _minLiquidity || value > 1e11) return 0;
  else if (value > _minLiquidity && value <= 100000) {
    const slope = (maxConfidence - 0.8) / (100000 - _minLiquidity);
    return 0.8 + slope * (value - _minLiquidity);
  } else return maxConfidence;
}

let coreAssetFile: Promise<any>;

async function getCoreAssetsFile() {
  if (!coreAssetFile)
    coreAssetFile = axios
      .get(
        "https://raw.githubusercontent.com/DefiLlama/DefiLlama-Adapters/main/projects/helper/coreAssets.json",
      )
      .then((res: any) => res.data);
  return coreAssetFile;
}

async function getCoreTokenSet(chain: string) {
  if (!coreAssetsCache[chain]) {
    const coreAssets = await getCoreAssetsFile();
    const tokens = Object.values(coreAssets[chain] ?? {}).map((i: any) =>
      i.toLowerCase(),
    );
    coreAssetsCache[chain] = new Set(tokens);
  }
  return coreAssetsCache[chain];
}

function getLPSymbol(token0: string, token1: string, lp: string) {
  if (!token0) token0 = "-";
  if (!token1) token1 = "-";

  const shorten = (str: string) => (str.length > 10 ? str.slice(0, 10) : str);
  return `${shorten(token0)}/${shorten(token1)} ${lp}`;
}

const defaultGetReservesAbi =
  "function getReserves() view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)";

export function getUniV2Adapter({
  endpoint,
  project,
  chain,
  minLiquidity = MinLiquidity,
  minVolume = MinVolume,
  factory,
  uniqueLPNames = false,
  getReservesAbi = defaultGetReservesAbi,
  hasStablePools = false,
  stablePoolSymbol = "sAMM",
}: {
  endpoint?: string;
  factory?: string;
  project: string;
  chain: string;
  minLiquidity?: number;
  minVolume?: number;
  uniqueLPNames?: boolean;
  getReservesAbi?: string;
  stablePoolSymbol?: string;
  hasStablePools?: boolean;
}) {
  const graphAdapter = async (timestamp: number = 0) => {
    const api = new ChainApi({ chain, timestamp });
    const coreTokenSet = await getCoreTokenSet(chain);
    const block = (await api.getBlock()) - 100; // 100 blocks behind
    const allData = [];
    let lastId = "";
    do {
      const query = `
      {
        pairs (where: { 
            reserveUSD_gt: ${minLiquidity}
            ${lastId == "" ? "" : `id_gt: "${lastId}"`}
            ${timestamp == 0
          ? ``
          : `createdAtTimestamp_lt: ${(timestamp * 1000).toString()}`
        }
            volumeUSD_gt: ${minVolume}
          } 
        ${ ["uniswap", "uni_base"].includes(project) && timestamp == 0 ? "" : `block: { number: ${block} }`} 
        first: 1000
        ) {
          id
          token0 {
            id
            decimals
            symbol
          }
          token1 {
            id
            decimals
            symbol
          }
          reserve0
          reserve1
          reserveUSD
          totalSupply
        }
      }
      `;

      const response = await axios.post(endpoint!, { query });
      const pairs = response.data.data.pairs;

      pairs.forEach((pair: any) => {
        pair.id = pair.id.toLowerCase();
        pair.token0.id = pair.token0.id.toLowerCase();
        pair.token1.id = pair.token1.id.toLowerCase();
      });
      allData.push(
        ...pairs.filter(
          ({ token0, token1 }: any) =>
            coreTokenSet.has(token0.id) || coreTokenSet.has(token1.id),
        ),
      ); // only keep pairs with at least one core token
      lastId = pairs[pairs.length - 1]?.id;

      if (lastId) {
        await sleep(1000);
      }
    } while (allData.length < 15000 && lastId);

    const decimals = await api.call({
      abi: "erc20:decimals",
      target: allData[0].id,
    });
    const LP_SYMBOL = await api.call({
      abi: "erc20:symbol",
      target: allData[0].id,
    });
    const underlyingPrices = await getTokenAndRedirectDataMap(assetsToTestAgainst[chain] ?? [], chain, timestamp);
    const token0Balances = await api.multiCall({ abi: 'erc20:balanceOf', calls: allData.map((p: any) => ({ target: p.token0.id, params: p.id })), permitFailure: true  })
    const token1Balances = await api.multiCall({ abi: 'erc20:balanceOf', calls: allData.map((p: any) => ({ target: p.token1.id, params: p.id })), permitFailure: true  })
    const writes: Write[] = [];

    const tokenData: any = {};
    allData.forEach((pair: any, i: number) => {
      const token0 = pair.token0;
      const token1 = pair.token1;
      const symbol = getLPSymbol(token0.symbol, token1.symbol, LP_SYMBOL);

      const { price, confidence } = findPrice();

      // return true if subgraph data is inflated
      function findPrice() {
        const confidence = calculateConfidence(pair.reserveUSD);
        const subgraphPrice = pair.reserveUSD / pair.totalSupply;
        if (!assetsToTestAgainst[chain]) return { price: subgraphPrice, confidence };
        
        let knownToken;
        if (assetsToTestAgainst[chain].includes(token0.id)) knownToken = token0;
        else if (assetsToTestAgainst[chain].includes(token1.id)) knownToken = token1;
        else return { price: subgraphPrice, confidence };

        const knownTokenPrice = underlyingPrices[knownToken.id];
        const knownTokenBalance = knownToken == token0 ? token0Balances[i] : token1Balances[i];
        if (!knownTokenBalance) return { price: subgraphPrice, confidence };

        const supply = pair.totalSupply;
        const aum = knownTokenPrice.price * knownTokenBalance * 2 / 10 ** knownTokenPrice.decimals;

        const onChainPrice = aum / supply;
        return { price: Math.min(onChainPrice, subgraphPrice), confidence: calculateConfidence(aum) };
      }

      if (confidence > 0.8)
        addToDBWritesList(
          writes,
          chain,
          pair.id,
          price,
          decimals,
          symbol,
          timestamp,
          project,
          confidence,
        );

      addTokenData(token0);
      addTokenData(token1);

      function addTokenData(token: any) {
        if (skipToken(token)) return;
        const liquidity = pair.reserveUSD / 2;
        const supply = token.id === token0.id ? pair.reserve0 : pair.reserve1;
        if (!tokenData[token.id]) {
          tokenData[token.id] = {
            metadata: token,
            supply: +supply,
            liquidity: +liquidity,
          };
        } else {
          tokenData[token.id].supply += +supply;
          tokenData[token.id].liquidity += +liquidity;
        }
      }
    });

    Object.values(tokenData).forEach(
      ({ metadata: { id, symbol, decimals }, supply, liquidity }: any) => {
        const confidence = calculateConfidence(liquidity, minLiquidity / 2);
        const price = liquidity / supply;
        if (isNaN(price)) {
          // console.log("bug in uni v2 pricing", { id, symbol, supply, liquidity, price, decimals, });
          return;
        }
        if (confidence > 0.8)
          addToDBWritesList(
            writes,
            chain,
            id,
            price,
            decimals,
            symbol,
            timestamp,
            project,
            confidence,
          );
      },
    );

    return writes;

    function skipToken({ id }: { id: string; name: string; symbol: string }) {
      return coreTokenSet.has(id);
      // return coreTokenSet.has(id) && (name.toLowerCase().startsWith('wrapped ') || ['USDC', 'USDT'].includes(symbol))
    }
  };

  const onChainAdapter = async (timestamp: number = 0) => {
    const api = new ChainApi({ chain, timestamp });
    const coreTokenSet = await getCoreTokenSet(chain);
    const coreTokens = Array.from(coreTokenSet);
    if (!coreTokens.length) {
      console.error("No core tokens found" + chain + project);
      return [];
    }

    factory = factory!.toLowerCase();
    const cacheKey = `tvl-adapter-cache/cache/uniswap-forks/${factory}-${chain}.json`;

    let res = await cache.readCache(cacheKey, { readFromR2Cache: true });
    let { pairs, token0s, token1s, symbols } = res;
    if (!pairs?.length)
      throw new Error("No pairs found, is there TVL adapter for this already?");
    if (pairs.length > 20 * 1000)
      throw new Error("Too many pairs found, try using the graph?");

    pairs = pairs.map((i: any) => i.toLowerCase());
    token0s = token0s.map((i: any) => i.toLowerCase());
    token1s = token1s.map((i: any) => i.toLowerCase());
    const allTokens = [...token0s, ...token1s];

    const [tokenInfoMap, coinsDataMap] = await Promise.all([
      getTokenInfoMap(chain, allTokens),
      getTokenAndRedirectDataMap(allTokens, chain, timestamp, 4),
    ]);

    const lpSupplies = await api.multiCall({
      abi: "erc20:totalSupply",
      calls: pairs,
      permitFailure: true,
    });
    const reserves = await api.multiCall({
      abi: getReservesAbi,
      calls: pairs,
      permitFailure: true,
    });
    const lpDecimals = await api.call({
      abi: "erc20:decimals",
      target: pairs[0],
    });
    const lpSymbol = await api.call({ abi: "erc20:symbol", target: pairs[0] });
    let lpSymbols: any = {};
    if (hasStablePools) uniqueLPNames = true;
    if (uniqueLPNames) lpSymbols = await getTokenInfoMap(chain, pairs);

    const writes: Write[] = [];

    const tokenData: any = {};
    pairs.forEach((pair: any, idx: number) => {
      const totalSupply = lpSupplies[idx];
      if (!totalSupply || reserves[idx] == null) return;

      const [reserve0, reserve1] = reserves[idx];
      const token0 = token0s[idx];
      const token1 = token1s[idx];
      const t1Data = coinsDataMap[token1];
      const t0Data = coinsDataMap[token0];
      if (!t1Data && !t0Data) return; // we dont know the price of underlying tokens

      const token0Symbol = tokenInfoMap[token0]?.symbol;
      const token1Symbol = tokenInfoMap[token1]?.symbol;
      let symbol = getLPSymbol(token0Symbol, token1Symbol, lpSymbol);
      if (uniqueLPNames) symbol = lpSymbols[pair]?.symbol ?? symbol;

      let reserveUSD = 0;
      const isStablePool = hasStablePools && symbol.includes(stablePoolSymbol);

      if (isStablePool) {
        if (!t1Data || !t0Data) return; // we dont know the price of underlying tokens
        const { decimals: t0Decimals, price: t0Price } = t0Data;
        const { decimals: t1Decimals, price: t1Price } = t1Data;
        reserveUSD += t0Price * (reserve0 / 10 ** t0Decimals);
        reserveUSD += t1Price * (reserve1 / 10 ** t1Decimals);
      } else if (coinsDataMap[token0]) {
        // if we know the price of token0
        const { decimals, price } = coinsDataMap[token0];
        reserveUSD += price * 2 * (reserve0 / 10 ** decimals);
        if (coreTokenSet.has(token0) && !coreTokenSet.has(token1)) {
          if (!tokenData[token1]) {
            tokenData[token1] = {
              supply: +reserve1,
              liquidity: reserveUSD / 2,
            };
          } else {
            tokenData[token1].supply += +reserve1;
            tokenData[token1].liquidity += reserveUSD / 2;
          }
        }
      } else if (coinsDataMap[token1]) {
        // if we know the price of token1
        const { decimals, price } = coinsDataMap[token1];
        reserveUSD += price * 2 * (reserve1 / 10 ** decimals);
        if (coreTokenSet.has(token1) && !coreTokenSet.has(token0)) {
          if (!tokenData[token0]) {
            tokenData[token0] = {
              supply: +reserve0,
              liquidity: reserveUSD / 2,
            };
          } else {
            tokenData[token0].supply += +reserve0;
            tokenData[token0].liquidity += reserveUSD / 2;
          }
        }
      }

      const confidence = calculateConfidence(reserveUSD);
      const price = (reserveUSD * 10 ** lpDecimals) / totalSupply;

      if (confidence > 0.8)
        addToDBWritesList(
          writes,
          chain,
          pair,
          price,
          lpDecimals,
          symbol,
          timestamp,
          project,
          confidence,
        );
    });

    Object.entries(tokenData).forEach(
      ([tokenId, { supply, liquidity }]: any) => {
        const confidence = calculateConfidence(liquidity, minLiquidity / 2);
        const decimals = tokenInfoMap[tokenId]?.decimals;
        if (isNaN(+decimals)) return;
        const price = (liquidity * 10 ** decimals) / supply;
        const symbol = tokenInfoMap[tokenId]?.symbol ?? "-";
        if (confidence > 0.8)
          addToDBWritesList(
            writes,
            chain,
            tokenId,
            price,
            decimals,
            symbol,
            timestamp,
            project,
            confidence,
          );
      },
    );

    return writes;
  };

  return async (timestamp: number = 0) => {
    if (endpoint) {
      try {
        const writes = await graphAdapter(timestamp);
        return writes;
      } catch (e) {
        if (factory)
          console.error(
            "Error using graph adapter" + (e as any).toString() + endpoint,
          );
        else throw e;
      }
    }

    if (!factory) {
      throw new Error("No endpoint or factory provided");
    }

    return onChainAdapter(timestamp);
  };
}
