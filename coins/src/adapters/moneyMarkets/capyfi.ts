import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";

const CHAIN = "ethereum";
const LAC = "0x0Df3a853e4B604fC2ac0881E9Dc92db27fF7f51b"; // LAC ERC-20
const ORACLE = "0x8Ec37E2C6F54a0700fcC079F2e148bC33b31aB4f"; // AggregatorV3Interface proxy for LAC / USD

export async function capyfi(timestamp: number) {
  const api = await getApi(CHAIN, timestamp);
  const writes: Write[] = [];

  const result = await api.multiCall({
    calls: [{
      target: ORACLE,
    }],
    abi: "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  });

  const price = Number(result[0].answer) / 1e8; // Chainlink answers are 8 decimals

  addToDBWritesList(
    writes,
    CHAIN,
    LAC,
    price,
    18,      
    "LAC", 
    timestamp,
    "capyfi-oracle",
    0.9    
  );

  return writes;
}