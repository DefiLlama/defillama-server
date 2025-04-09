import fetch from "node-fetch";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";

const CALL_PREVIEW_URL =
  "https://radix-mainnet.rpc.grove.city/v1/326002fc/core/transaction/call-preview";

const RESOURCE_STATE_URL =
  "https://radix-mainnet.rpc.grove.city/v1/326002fc/core/state/resource";

const config: {
  [symbol: string]: { pool: string; address: string; underlying: string };
} = {
  LSULP: {
    pool: "component_rdx1cppy08xgra5tv5melsjtj79c0ngvrlmzl8hhs7vwtzknp9xxs63mfp",
    address:
      "resource_rdx1thksg5ng70g9mmy9ne7wz0sc7auzrrwy7fmgcxzel2gvp8pj0xxfmf",
    underlying:
      "resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd",
  },
};

export async function lsulp(timestamp: number = 0) {
  if (timestamp && timestamp != 0)
    throw new Error(`LSULP adapter can only work with current timestamp`);

  const pricesObject: any = {};
  const writes: Write[] = [];

  await Promise.all(
    Object.keys(config).map(async (symbol: string) => {
      const { address, pool, underlying } = config[symbol];

      const balanceRes = await fetch(CALL_PREVIEW_URL, {
        method: "POST",
        body: JSON.stringify({
          network: "mainnet",
          target: {
            type: "Method",
            component_address: pool,
            method_name: "get_dex_valuation_xrd",
          },
          arguments: [],
        }),
      }).then((res) => res.json());

      const resourceRes = await fetch(RESOURCE_STATE_URL, {
        method: "POST",
        body: JSON.stringify({
          network: "mainnet",
          resource_address: address,
        }),
      }).then((res) => res.json());

      const xrdBalance = balanceRes.output.programmatic_json.value;
      const lsulpSupply = resourceRes.manager.total_supply.value.total_supply;

      const price = xrdBalance / lsulpSupply;

      pricesObject[address] = {
        underlying,
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
    projectName: "radix-lsulp",
    writes,
  });
}
