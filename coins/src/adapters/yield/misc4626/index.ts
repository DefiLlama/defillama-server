import getTokenPrices from "./misc";
import tokens from "./tokens.json";
import tokensQiDAO from "./tokensQiDAO.json";
import { getYieldWrites2 } from "../../utils/yieldTokens";

export function misc4626(timestamp: number = 0) {
  console.log("starting misc 4626");
  const calls = Object.keys(tokens).map((c) => getTokenPrices(c, timestamp))
  const callsQiDAO = Object.keys(tokensQiDAO).map((c) => getQiDAOTokenPrices(c, timestamp))
  return Promise.all([calls, callsQiDAO].flat());
}

async function getQiDAOTokenPrices(chain: string, timestamp: number) {
  const priceAbi = 'function calculateUnderlying(uint256) view returns (uint256)'
  const tokens: string[] = Object.values((tokensQiDAO as any)[chain]) 
  return getYieldWrites2({ chain, timestamp, tokens, priceAbi, underlyingAbi: 'address:token', projectName: 'qidao'})
}