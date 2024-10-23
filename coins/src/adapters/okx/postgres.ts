import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { queryPostgresWithRetry } from "../../../coins2";
import { getCoins2Connection } from "../../../getDBConnection";
import { chainGasTokens, gasAddress } from "../../adapters/okx/constants";
import { getCache, setCache } from "../../utils/cache";

export async function storeOkxTokens(
  coins: { chain: string; address: string }[],
) {
  if (!coins.length) return;
  const sql = await getCoins2Connection();

  await queryPostgresWithRetry(
    sql`
      insert into okxtokens
      ${sql(coins, "chain", "address")}
      on conflict (chain, address)
      do nothing
    `,
    sql,
  );
}

export async function fetchMissingCoinMetadataForOkx() {
  // find coins that havent been checked
  const sql = await getCoins2Connection();
  const res: { chain: string; address: string }[] =
    await queryPostgresWithRetry(
      sql`
      select chain, address from unsupportedkeys
      where hasbeenchecked = false
    `,
      sql,
    );

  // query metadata for these coins
  let metadataResults: { [chain: string]: { [token: string]: any } } = {};
  res.map(({ chain, address }) => {
    if (!(chain in metadataResults)) metadataResults[chain] = {};
    if (address != gasAddress)
      metadataResults[chain][address] = {
        decimals: undefined,
        symbol: undefined,
      };
    else if (chain in chainGasTokens)
      metadataResults[chain][address] = {
        decimals: chainGasTokens[chain].decimals,
        symbol: chainGasTokens[chain].symbol,
      };
  });

  const calls: { [chain: string]: any[] } = {};
  Object.keys(metadataResults).map((chain) => {
    calls[chain] = Object.keys(metadataResults[chain])
      .map((target) => ({
        target,
      }))
      .filter((c) => c.target != gasAddress);
  });

  await Promise.all([
    ...Object.keys(metadataResults).map((chain: string) =>
      multiCall({
        abi: "erc20:symbol",
        chain,
        calls: calls[chain],
        permitFailure: true,
        withMetadata: true,
      }).then((rs) => {
        rs.map((r) => {
          metadataResults[chain][r.input.target].symbol = r.output;
        });
      }),
    ),
    ...Object.keys(metadataResults).map((chain: string) =>
      multiCall({
        abi: "erc20:decimals",
        chain,
        calls: calls[chain],
        permitFailure: true,
        withMetadata: true,
      }).then((rs) => {
        rs.map((r) => {
          metadataResults[chain][r.input.target].decimals = r.output;
        });
      }),
    ),
  ]);

  // set coins to checked
  await queryPostgresWithRetry(
    sql`
      update unsupportedkeys set hasbeenchecked = true`,
    sql,
  );

  // store metadata in cache or other
  const cache = await getCache("okx", "all");
  Object.keys(metadataResults).map((chain) =>
    Object.keys(metadataResults[chain]).map((token) => {
      if (!(chain in cache)) cache[chain] = {};
      const { decimals, symbol } = metadataResults[chain][token];
      if (!decimals || !symbol) return;
      cache[chain][token] = { decimals, symbol };
    }),
  );

  await setCache("okx", "all", cache);

  // on next faulty coins query, send it to okx
  return;
}
