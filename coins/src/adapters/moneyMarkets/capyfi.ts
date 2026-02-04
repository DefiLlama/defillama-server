import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";
import { getTokenInfo } from "../utils/erc20";

const CHAIN = "ethereum";
const LAC = "0x0Df3a853e4B604fC2ac0881E9Dc92db27fF7f51b"; // LAC ERC-20 on Ethereum
const ORACLE = "0x8Ec37E2C6F54a0700fcC079F2e148bC33b31aB4f"; // AggregatorV3Interface proxy for LAC / USD on Ethereum

// World Chain configuration
const WORLD_CHAIN = "wc";
const worldChainFeeds: { symbol: string; token: string; oracle: string }[] = [
  { symbol: "WARS", token: "0x0DC4F92879B7670e5f4e4e6e3c801D229129D90D", oracle: "0x69B7A672428c2DF42a415Af8E280F58ccf450402" },
  { symbol: "LAC", token: "0x0fe75cae44e409af8c9e631985d6b3de8e1138de", oracle: "0x8836Af878FC2ee9F11ce9652E39C878c1D7Eb019" }
];

const CHAINLINK_LATEST_ROUND_ABI =
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)";

export async function capyfi(timestamp: number) {
  const writes: Write[] = [];

  // Ethereum LAC via Chainlink
  {
    const api = await getApi(CHAIN, timestamp);
    const result = await api.multiCall({
      calls: [
        {
          target: ORACLE,
        },
      ],
      abi: CHAINLINK_LATEST_ROUND_ABI,
    });
    const price = Number((result as any)[0].answer) / 1e8; // Chainlink answers are 8 decimals

    addToDBWritesList(
      writes,
      CHAIN,
      LAC,
      price,
      18,
      "LAC",
      timestamp,
      "capyfi-oracle",
      0.9,
    );
  }

  // World Chain tokens via provided oracles
  if (worldChainFeeds.length) {
    const wcApi = await getApi(WORLD_CHAIN, timestamp);

    const pricesRes = await wcApi.multiCall({
      calls: worldChainFeeds.map((f) => ({ target: f.oracle })),
      abi: CHAINLINK_LATEST_ROUND_ABI,
      permitFailure: true,
    });

    const tokens = worldChainFeeds.map((f) => f.token);
    const tokenInfo = await getTokenInfo(WORLD_CHAIN, tokens, undefined);

    pricesRes.forEach((res: any, i: number) => {
      if (!res || res.answer === undefined || res.answer === null) return;
      const price = Number(res.answer) / 1e8;
      const decimals = tokenInfo.decimals?.[i]?.output ?? 18;
      const symbol = tokenInfo.symbols?.[i]?.output ?? worldChainFeeds[i].symbol;

      addToDBWritesList(
        writes,
        WORLD_CHAIN,
        worldChainFeeds[i].token,
        price,
        Number(decimals),
        symbol,
        timestamp,
        "capyfi-oracle",
        0.9,
      );
    });
  }

  return writes;
}