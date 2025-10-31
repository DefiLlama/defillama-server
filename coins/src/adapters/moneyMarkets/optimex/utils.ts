import { getApi } from "../../utils/sdk";
import { AGGREGATOR_ABI } from "./abi";

// BTC/USD Chainlink Oracle on Ethereum
const BTC_TO_USD_ORACLE_ETH = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c";

export async function getBtcToUsdPrice(timestamp: number): Promise<number> {
    const api = await getApi("ethereum", timestamp);
    const response = await api.call({ abi: AGGREGATOR_ABI, target: BTC_TO_USD_ORACLE_ETH });
    // Scale down to 8 decimals
    return response.answer / 1e8;
  }