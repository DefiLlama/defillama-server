import axios from "axios";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { PromisePool } from "@supercharge/promise-pool";

const decimals = 8;
const supplyQuery = 1000000;

export async function goblin(timestamp: number = 0) {
  if (timestamp != 0)
    throw new Error("Goblin adapter only supports timestamp = 0");

  const {
    data: {
      data: { vault },
    },
  } = await axios.post("https://api.hyperion.xyz/v1/graphql", {
    query: `query fetchAllVaultQuery {
            vault { tokenA  tokenB  vaultId  vaultName }  
        }`,
  });

  const underlyingAssets: string[] = [];
  vault.map((v: any) => {
    underlyingAssets.push(v.tokenA, v.tokenB);
  });

  const underlyingTokenData = await getTokenAndRedirectDataMap(
    underlyingAssets,
    "aptos",
    timestamp
  );

  const writes: Write[] = [];
  await PromisePool.withConcurrency(5)
    .for(vault)
    .process(async (v: any) => {
      const balances = await fetch(
        `https://api.mainnet.aptoslabs.com/v1/view`,
        {
          method: "POST",
          body: JSON.stringify({
            function: `0x19bcbcf8e688fd5ddf52725807bc8bf455a76d4b5a6021cfdc4b5b2652e5cd55::vaults::get_token_amount_by_share`,
            type_arguments: [],
            arguments: [v.vaultId, supplyQuery.toString()],
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      if (!balances.length) return;

      if (!underlyingTokenData[v.tokenA] || !underlyingTokenData[v.tokenB])
        return;

      const aumA =
        (balances[0] * underlyingTokenData[v.tokenA].price) /
        10 ** underlyingTokenData[v.tokenA].decimals;
      const aumB =
        (balances[1] * underlyingTokenData[v.tokenB].price) /
        10 ** underlyingTokenData[v.tokenB].decimals;

      const price = (aumA + aumB) / (supplyQuery / 10 ** decimals);

      addToDBWritesList(
        writes,
        "aptos",
        v.vaultId,
        price,
        decimals,
        `GoblinLP-${underlyingTokenData[v.tokenA].symbol}-${
          underlyingTokenData[v.tokenB].symbol
        }-${v.vaultName}`,
        timestamp,
        "goblin",
        0.9
      );
    });

  return writes;
}