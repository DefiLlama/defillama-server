import getTokenPrices from "./misc";
import tokens from "./tokens.json";
import tokensQiDAO from "./tokensQiDAO.json";
import { getYieldWrites2 } from "../../utils/yieldTokens";
import { unwrap4626 } from "../mean-finance/mean-finance";

export function misc4626(timestamp: number = 0) {
  const calls = Object.keys(tokens).map((c) => getTokenPrices(c, timestamp))
  const callsQiDAO = Object.keys(tokensQiDAO).map((c) => getQiDAOTokenPrices(c, timestamp))
  const callsHardcoded = hardCodedAssets4626(timestamp);
  return Promise.all([calls, callsQiDAO, callsHardcoded].flat());
}

async function getQiDAOTokenPrices(chain: string, timestamp: number) {
  const priceAbi = 'function calculateUnderlying(uint256) view returns (uint256)'
  const tokens: string[] = Object.values((tokensQiDAO as any)[chain]);
  return getYieldWrites2({ chain, timestamp, tokens, priceAbi, underlyingAbi: 'address:token', projectName: 'qidao'})
}

async function hardCodedAssets4626(timestamp: number = 0) {
  const assets: { [chain: string]: { token: string; underlying: string }[] } = {
    polygon: [
      {
        token: "0x9c14f9137fc7327f336cc73d4218d310f3faba11",
        underlying: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      },
      {
        token: "0x11C8f790d252F4A49cFBFf5766310873898BF5D3",
        underlying: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      },
    ],
  };

  return (
    await Promise.all(
      Object.keys(assets).map((c) =>
        unwrap4626(
          c,
          assets[c].map((a) => a.token),
          timestamp,
          "hardcoded",
          assets[c].map((a) => a.underlying),
        ),
      ),
    )
  ).flat();
}
