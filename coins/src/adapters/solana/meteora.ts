import { Connection, PublicKey } from "@solana/web3.js";
import { TokenListProvider } from "@solana/spl-token-registry";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { CoinData, Write } from "../utils/dbInterfaces";
import { getConnection } from "./utils";
import AmmImpl from "@mercurial-finance/dynamic-amm-sdk";
import { getCurrentUnixTimestamp } from "../../utils/date";

const pools = [
  {
    symbol: "SOL-mSOL MLP",
    decimals: 9,
    mint: "B2uEs9zjnz222hfUaUuRgesryUEYwy3JGuWe31sE9gsG",
    poolAddress: "HcjZvfeSNJbNkfLD4eEcRBr96AD3w1GpmMppaeRZf7ur",
    tokenAMint: "So11111111111111111111111111111111111111112",
    tokenBMint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  },
  {
    symbol: "SOL-bSOL MLP",
    decimals: 9,
    mint: "8ioaL3gTSAhNJy3t9JakXuoKobJvms62Ko5aWHvmHgSf",
    poolAddress: "DvWpLaNUPqoCGn4foM6hekAPKqMtADJJbJWhwuMiT6vK",
    tokenAMint: "So11111111111111111111111111111111111111112",
    tokenBMint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
  },
];

export async function meteora(timestamp: number) {
  const connection = getConnection();
  const writes: Write[] = [];
  for (const pool of pools) {
    const price = await getMeteoraLpPrice(
      connection,
      pool.poolAddress,
      pool.tokenAMint,
      pool.tokenBMint,
      timestamp,
    );

    if (!price) return;

    addToDBWritesList(
      writes,
      "solana",
      pool.mint,
      price,
      pool.decimals,
      pool.symbol,
      timestamp,
      pool.symbol,
      0.95,
    );
  }
  return writes;
}

async function getMeteoraLpPrice(
  connection: Connection,
  poolAddress: string,
  tokenAMint: string,
  tokenBMint: string,
  timestamp: number,
): Promise<number | undefined> {
  if (timestamp == 0) timestamp = getCurrentUnixTimestamp();
  const tlp = await new TokenListProvider().resolve();
  const tokenList = tlp.filterByClusterSlug("mainnet-beta").getList();

  const tokenA = tokenList.find((token: any) => token.address === tokenAMint)!;
  const tokenB = tokenList.find((token: any) => token.address === tokenBMint)!;

  const tokenData = await getTokenAndRedirectData(
    [tokenAMint, tokenBMint],
    "solana",
    timestamp,
  );
  const tokenAPrice: CoinData | undefined = tokenData.find(
    (c: CoinData) => c.address === tokenAMint,
  );
  const tokenBPrice: CoinData | undefined = tokenData.find(
    (c: CoinData) => c.address === tokenBMint,
  );

  if (!tokenAPrice || !tokenBPrice) return undefined;
  const lstPool = await AmmImpl.create(
    connection,
    new PublicKey(poolAddress),
    tokenA,
    tokenB,
  );

  const lpMintMultiplier = await connection
    .getTokenSupply(lstPool.poolState.lpMint)
    .then((v) => 10 ** v.value.decimals);

  const tokenAMultiplier = 10 ** lstPool.tokenA.decimals;
  const tokenBMultiplier = 10 ** lstPool.tokenB.decimals;

  const tokenAReserveAmount =
    Number(lstPool.poolInfo.tokenAAmount.toString()) / tokenAMultiplier;

  const tokenBReserveAmount =
    Number(lstPool.poolInfo.tokenBAmount.toString()) / tokenBMultiplier;

  let totalValueLocked =
    tokenAReserveAmount * tokenAPrice.price +
    tokenBReserveAmount * tokenBPrice.price;

  const lpSupply =
    Number(lstPool.poolState.lpSupply.toString()) / lpMintMultiplier;

  return totalValueLocked / lpSupply;
}
