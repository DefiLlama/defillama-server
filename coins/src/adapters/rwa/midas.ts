import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const DATA_FEED_ABI = "function getDataInBase18() external view returns (int256 answer)";
const AGGREGATOR_ABI = "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)";

const contracts: {
  [chain: string]: { name: string; token: string; oracle?: string; requiresConversion?: boolean }[];
} = {
  ethereum: [
    { name: "mTBILL", token: "0xDD629E5241CbC5919847783e6C96B2De4754e438", oracle: "0xfCEE9754E8C375e145303b7cE7BEca3201734A2B" },
    { name: "mBASIS", token: "0x2a8c22E3b10036f3AEF5875d04f8441d4188b656", oracle: "0x1615cBC603192ae8A9FF20E98dd0e40a405d76e4" },
    { name: "mBTC", token: "0x007115416AB6c266329a03B09a8aa39aC2eF7d9d", oracle: "0x9987BE0c1dc5Cd284a4D766f4B5feB4F3cb3E28e", requiresConversion: true },
    { name: "mEDGE", token: "0xbB51E2a15A9158EBE2b0Ceb8678511e063AB7a55", oracle: "0x20cd58F72cF1727a2937eB1816593390cf8d91cB" },
    { name: "mMEV", token: "0x030b69280892c888670EDCDCD8B69Fd8026A0BF3", oracle: "0x9BF00b7CFC00D6A7a2e2C994DB8c8dCa467ee359" },
    { name: "mRe7YIELD", token: "0x87C9053C819bB28e0D73d33059E1b3DA80AFb0cf", oracle: "0x7E8C632ab231479886AF1Bc02B9D646e4634Da93" },
    { name: "mF-ONE", token: "0x238a700eD6165261Cf8b2e544ba797BC11e466Ba", oracle: "0xCF4e49f5e750Af8F2f9Aa1642B68E5839D9c1C00" },
  ],
  base: [
    { name: "mTBILL", token: "0xDD629E5241CbC5919847783e6C96B2De4754e438", oracle: "0xcbCf1e67F1988e2572a2A620321Aef2ff73369f0" },
    { name: "mBASIS", token: "0x1C2757c1FeF1038428b5bEF062495ce94BBe92b2", oracle: "0xD48D38Ec56CDB44c4281068129038A37F5Df04e5" },
  ],
  sapphire: [
    { name: "mTBILL", token: "0xDD629E5241CbC5919847783e6C96B2De4754e438" },
  ],
  etlk: [
    { name: "mTBILL", token: "0xDD629E5241CbC5919847783e6C96B2De4754e438" },
    { name: "mBASIS", token: "0x2247B5A46BB79421a314aB0f0b67fFd11dd37Ee4" },
  ],
  rsk: [
    { name: "mTBILL", token: "0xDD629E5241CbC5919847783e6C96B2De4754e438" },
    { name: "mBTC", token: "0xEF85254Aa4a8490bcC9C02Ae38513Cae8303FB53" },
  ],
  plume_mainnet: [
    { name: "mTBILL", token: "0xE85f2B707Ec5Ae8e07238F99562264f304E30109", oracle: "0x73a64469E0974371005ca0f60Dfc10405613b411" },
    { name: "mBASIS", token: "0x0c78Ca789e826fE339dE61934896F5D170b66d78", oracle: "0x7588139737f32A6da49b9BB03A0a91a45603b45F" },
    { name: "mEDGE", token: "0x69020311836D29BA7d38C1D3578736fD3dED03ED", oracle: "0xa30e78AF094EFC51434693803fEE1D77f568321E" },
    { name: "mMEV", token: "0x7d611dC23267F508DE90724731Dc88CA28Ef7473", oracle: "0x06fa9188680D8487e2b743b182CCc39654211C84" },
  ],
};

const btcToUsdOracleEth = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c";

async function getBtcToUsdPrice(timestamp: number): Promise<number> {
  const api = await getApi("ethereum", timestamp);
  const response = await api.call({ abi: AGGREGATOR_ABI, target: btcToUsdOracleEth });
  return response.answer / 1e8;
}

async function getTokenPrices(chain: string, timestamp: number, ethereumPrices: Record<string, number>): Promise<Write[]> {
  const api = await getApi(chain, timestamp);
  const tokens = contracts[chain] || [];
  const btcToUsdPrice = await getBtcToUsdPrice(timestamp);

  const tokensWithOracles = tokens.filter(t => t.oracle);
  const tokensWithoutOracles = tokens.filter(t => !t.oracle);

  let prices: Record<string, { price: number }> = {};
  if (tokensWithOracles.length > 0) {
    const dataFeedResponses = await api.multiCall({
      abi: DATA_FEED_ABI,
      calls: tokensWithOracles.map(({ oracle }) => oracle as string),
    });

    prices = tokensWithOracles.reduce((acc, { token, requiresConversion, name }, i) => {
      const rawVal = dataFeedResponses[i];
      if (rawVal !== null && rawVal !== undefined) {
        const price = (rawVal / 1e18) * (requiresConversion ? btcToUsdPrice : 1);
        acc[token] = { price };

        if (chain === 'ethereum') {
          ethereumPrices[name] = price;
        }
      }
      return acc;
    }, {} as Record<string, { price: number }>);
  }

  for (const t of tokensWithoutOracles) {
    const { name, token } = t;
    const fallbackPrice = ethereumPrices[name];
    if (fallbackPrice !== undefined) {
      prices[token] = { price: fallbackPrice };
    }
  }

  return getWrites({
    chain,
    timestamp,
    pricesObject: prices,
    projectName: "midas",
  });
}

export async function midas(timestamp: number = 0): Promise<Write[]> {
  const ethereumPrices: Record<string, number> = {};

  const chains = Object.keys(contracts);
  const ethereumIndex = chains.indexOf('ethereum');

  let ethereumWrites: Write[] = [];
  let otherChainWrites: Write[] = [];

  if (ethereumIndex !== -1) {
    ethereumWrites = await getTokenPrices('ethereum', timestamp, ethereumPrices);
    chains.splice(ethereumIndex, 1);
  }

  if (chains.length > 0) {
    const results = await Promise.all(chains.map(c => getTokenPrices(c, timestamp, ethereumPrices)));
    otherChainWrites = results.flat();
  }

  return [...ethereumWrites, ...otherChainWrites];
}
