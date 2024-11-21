import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const DATA_FEED_ABI = "function getDataInBase18() external view returns (int256 answer)";
const AGGREGATOR_ABI = "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)";

const contracts: {[chain: string]: { token: string, oracle: string, requiresConversion?: boolean }[] } = {
  ethereum: [
    { token: "0xDD629E5241CbC5919847783e6C96B2De4754e438", oracle: "0xfCEE9754E8C375e145303b7cE7BEca3201734A2B" }, // mTBILL
    { token: "0x2a8c22E3b10036f3AEF5875d04f8441d4188b656", oracle: "0x1615cBC603192ae8A9FF20E98dd0e40a405d76e4" }, // mBASIS
    { token: "0x007115416AB6c266329a03B09a8aa39aC2eF7d9d", oracle: "0x9987BE0c1dc5Cd284a4D766f4B5feB4F3cb3E28e", requiresConversion: true }, // mBTC
  ],
  base: [
    { token: "0xDD629E5241CbC5919847783e6C96B2De4754e438", oracle: "0xcbCf1e67F1988e2572a2A620321Aef2ff73369f0" }, // mTBILL
    { token: "0x1C2757c1FeF1038428b5bEF062495ce94BBe92b2", oracle: "0xD48D38Ec56CDB44c4281068129038A37F5Df04e5" }, // mBASIS
  ],
};

const btcToUsdOracle: {[chain: string]: string } = {
  ethereum: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
};

async function getBtcToUsdPrice(api: any, btcOracle: string): Promise<number> {
  if (!btcOracle) return 1;
  const response = await api.call({ abi: AGGREGATOR_ABI, target: btcOracle });
  return response.answer / 1e8;
}

async function getTokenPrices(chain: string, timestamp: number): Promise<Write[]> {
  const api = await getApi(chain, timestamp);
  const tokens = contracts[chain] || [];
  const btcOracle = btcToUsdOracle[chain];
  const btcToUsdPrice = await getBtcToUsdPrice(api, btcOracle);

  const dataFeedResponses = await api.multiCall({
    abi: DATA_FEED_ABI,
    calls: tokens.map(({ oracle }) => oracle),
  });
  
  const prices = tokens.reduce((acc, { token, requiresConversion }, i) => {
    const price = (dataFeedResponses[i] / 1e18) * (requiresConversion ? btcToUsdPrice : 1);
    acc[token] = { price };
    return acc;
  }, {} as Record<string, { price: number }>);
  
  return getWrites({
    chain,
    timestamp,
    pricesObject: prices,
    projectName: "midas",
  });
}

export async function midas(timestamp: number = 0): Promise<Write[]> {
  const writes = await Promise.all(
    Object.keys(contracts).map((chain) => getTokenPrices(chain, timestamp))
  );
  return writes.flat();
}
