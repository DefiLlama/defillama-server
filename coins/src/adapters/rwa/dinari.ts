import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const oracles: any = {
  arbitrum: {
    "AAPL.d": { oracle: "0x8d0CC5f38f9E802475f2CFf4F9fc7000C2E1557c", token: '0xCe38e140fC3982a6bCEbc37b040913EF2Cd6C5a7' },
    "AMZN.d": { oracle: "0xd6a77691f071E98Df7217BED98f38ae6d2313EBA", token: '0x5a8A18673aDAA0Cd1101Eb4738C05cc6967b860f' },
    "GOOGL.d": { oracle: "0x1D1a83331e9D255EB1Aaf75026B60dFD00A252ba", token: '0x9bd7A08cD17d10E02F596Aa760dfE397C57668b4' },
    "META.d": { oracle: "0xcd1bd86fDc33080DCF1b5715B6FCe04eC6F85845", token: '0xa40c0975607BDbF7B868755E352570454b5B2e48' },
    "MSFT.d": { oracle: "0xDde33fb9F21739602806580bdd73BAd831DcA867", token: '0x20f11c1aBca831E235B15A4714b544Bb968f8CDF' },
    "TSLA.d": { oracle: "0x3609baAa0a9b1f0FE4d6CC01884585d0e191C3E3", token: '0x2888c0aC959484e53bBC6CdaBf2b8b39486225C6' },
    "SPY.d": { oracle: "0x46306F3795342117721D8DEd50fbcF6DF2b3cc10", token: '0xF4BD09B048248876E39Fcf2e0CDF1aee1240a9D2' },
  }
}

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  const info = Object.values(oracles[chain])
  const tokens = info.map((o: any) => o.token);
  const prices = await api.multiCall({ abi: 'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)', calls: info.map((o: any) => o.oracle), });
  const pricesObject: any = {};
  const writes: Write[] = [];
  tokens.forEach((contract: any, idx: number) => {
    pricesObject[contract] = { price: prices[idx].answer / 1e8 };
  });

  writes.push(
    ...(await getWrites({ chain, timestamp, writes, pricesObject, projectName: "dinari", })),
  );

  return writes;
}

export function dinari(timestamp: number = 0) {
  console.log("starting dinari");
  return getTokenPrices("arbitrum", timestamp);
}
