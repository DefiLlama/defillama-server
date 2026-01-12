import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../utils/block";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";

const ORACLE_ADDRESS: string = "0x354d1e7d9cf90841dfa252547881db96af2aae3e";
const TOKEN_ADDRESS: string = "0xc8a8df9b210243c55d31c73090f06787ad0a1bf6";
const chain = "ethereum";

const latestRoundDataABI = {
  inputs: [],
  name: "latestRoundData",
  outputs: [
    { internalType: "uint80", name: "roundId", type: "uint80" },
    { internalType: "int256", name: "answer", type: "int256" },
    { internalType: "uint256", name: "startedAt", type: "uint256" },
    { internalType: "uint256", name: "updatedAt", type: "uint256" },
    { internalType: "uint80", name: "answeredInRound", type: "uint80" }
  ],
  stateMutability: "view",
  type: "function"
};

export default async function getTokenPrice(timestamp: number = 0) {
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);

  const { output: oracleData } = await call({
    target: ORACLE_ADDRESS,
    abi: latestRoundDataABI,
    block,
    chain
  });

  const answer = oracleData.answer || oracleData[1];
  const price: number = Number(answer) / 1e8;

  addToDBWritesList(
    writes,
    chain,
    TOKEN_ADDRESS,
    price,
    18,
    "syzUSD",
    timestamp,
    "syzUSD",
    0.9
  );

  return writes;
}