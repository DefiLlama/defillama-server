import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./utils";
import getWrites from "../utils/getWrites";

const tokens: {
  [pool: string]: { address: string; symbol: string; decimals: number };
} = {
  hy1o2kiYu9rUDFqHJSqwJH4j5ZkM23tBJsaEmqkP9sT: {
    address: "hy1opf2bqRDwAxoktyWAj6f3UpeHcLydzEdKjMYGs2u",
    symbol: "hyloSOL+",
    decimals: 9,
  },
  hy1oDeVCVRDGkxS26qLVDvRhDpZGfWJ6w9AMvwMegwL: {
    address: "hy1oXYgrBW6PVcJ4s6s2FKavRdwgWTXdfE69AxT7kPT",
    symbol: "hyloSOL",
    decimals: 9,
  },
};

export async function stakingPools(timestamp: number = 0) {
  if (timestamp != 0)
    throw new Error(`stakingPools must only run at timestamp = 0`);

  const connection = getConnection();

  const pricesObject: any = {};
  await Promise.all(
    Object.keys(tokens).map(async (pool) => {
      const stakeInfo = await connection.getAccountInfo(new PublicKey(pool));
      if (!stakeInfo) throw new Error(`stakingPools adapter failed`);
      const deserializedAccountInfo = Number(
        stakeInfo.data.readBigUInt64LE(258),
      );

      const tokenInfo = await connection.getAccountInfo(
        new PublicKey(tokens[pool].address),
      );
      if (!tokenInfo) throw new Error(`stakingPools adapter failed`);
      const supply = Number(tokenInfo.data.readBigUInt64LE(36));

      pricesObject[tokens[pool].address] = {
        price: deserializedAccountInfo / supply,
        underlying: "So11111111111111111111111111111111111111112",
        symbol: tokens[pool].symbol,
        decimals: tokens[pool].decimals,
      };
    }),
  );

  return await getWrites({
    chain: "solana",
    timestamp,
    pricesObject,
    projectName: "stakingPools",
  });
}
