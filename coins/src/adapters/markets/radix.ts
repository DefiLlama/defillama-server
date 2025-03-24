import fetch from "node-fetch";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";

const COMPONENT_STATE_URL =
  "https://radix-mainnet.rpc.grove.city/v1/326002fc/core/state/component";

const config: {
  [symbol: string]: { pool: string; address: string; precision: number };
} = {
  LSULP: {
    pool: "component_rdx1crdhl7gel57erzgpdz3l3vr64scslq4z7vd0xgna6vh5fq5fnn9xas",
    address:
      "resource_rdx1thksg5ng70g9mmy9ne7wz0sc7auzrrwy7fmgcxzel2gvp8pj0xxfmf",
    precision: 4,
  },
};

export async function radixUnkownToken(timestamp: number = 0) {
  if (timestamp && timestamp != 0)
    throw new Error(`LSULP adapter can only work with current timestamp`);

  const pricesObject: any = {};
  const writes: Write[] = [];

  await Promise.all(
    Object.keys(config).map(async (symbol: string) => {
      const { pool, address, precision } = config[symbol];
      const body = JSON.stringify({
        network: "mainnet",
        component_address: pool,
      });

      const res = await fetch(COMPONENT_STATE_URL, {
        method: "POST",
        body,
      }).then((res) => res.json());

      const assetBalances: { [asset: string]: number } = {};
      res.vaults.map((vault: any) => {
        assetBalances[vault.resource_amount.resource_address] =
          vault.resource_amount.amount;
      });

      const knownAsset = Object.keys(assetBalances).find((v) => v != address);
      if (!knownAsset) return;

      const price =
        (assetBalances[address] * 10 ** precision) / assetBalances[knownAsset];

      pricesObject[address] = {
        underlying: knownAsset,
        symbol,
        decimals: 0,
        price,
      };
    }),
  );

  return await getWrites({
    chain: "radixdlt",
    timestamp,
    pricesObject,
    projectName: "radix-unknown",
    writes,
  });
}
