import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./utils";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";

const JTO = "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL";

const assets: {
  [token: string]: { oracle: string; symbol: string; decimals: number };
} = {
  kyJtowDDACsJDm2jr3VZdpCA6pZcKAaNftQwrJ8KBQP: {
    oracle: "ABsoYTwRPBJEf55G7N8hVw7tQnDKBA6GkZCKBVrjTTcf",
    symbol: "kyJTO",
    decimals: 9,
  },
  WFRGJnQt5pK8Dv4cDAbrSsgPcmboysrmX3RYhmRRyTR: {
    oracle: "BmJvUzoiiNBRx3v2Gqsix9WvVtw8FaztrfBHQyqpMbTd",
    symbol: "wfragJTO",
    decimals: 9,
  },
  [JTO]: {
    oracle: "",
    symbol: "JTO",
    decimals: 9,
  },
};

export async function jtoDerivs(timestamp: number = 0) {
  if (timestamp != 0)
    throw new Error(`jtoDerivs must only run at timestamp = 0`);

  const connection = getConnection();
  const pricesObject: any = {};

  await Promise.all(
    Object.keys(assets).map(async (asset: string) => {
      if (asset == JTO) return;
      const accountInfo = await connection.getAccountInfo(
        new PublicKey(assets[asset].oracle),
      );
      if (!accountInfo) return;

      const vrtSupply = Number(accountInfo.data.readBigUInt64LE(104));
      const tokensDeposited = Number(accountInfo.data.readBigUInt64LE(112));

      pricesObject[asset] = {
        underlying: JTO,
        symbol: assets[asset].symbol,
        decimals: assets[asset].decimals,
        price: tokensDeposited / vrtSupply,
      };
    }),
  );

  const writes: Write[] = [];
  return await getWrites({
    chain: "solana",
    timestamp,
    pricesObject,
    projectName: "JTO derivs",
    writes,
  });
}
