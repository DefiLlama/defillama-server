import fetch from "node-fetch";
import getWrites from "../utils/getWrites";
import { Write } from "../utils/dbInterfaces";
import setEnvSecrets from "../../utils/shared/setEnvSecrets";

const assets: { [symbol: string]: string } = {
  "sUSDE/USDC.x":
    "0x35c3e420fa4fd925628366f1977865d62432c8856a2db147a1cb13f7207f6a79",
  "USDC/USDT.x":
    "0x5b07f08f0c43104b1dcb747273c5fc13bd86074f6e8e591bf0d8c5b08720cbd4",
  "MOD/USDC.x":
    "0x2ced9638b769c72ff2f4dd063346ef514c737206146628dc443efe098418d739",
  "APT/USDC.x":
    "0x15b6b3396e883afa0fd10e82b964d09d562657ee3a583c12e65e2385521fcd69",
  "APT/USDT.x":
    "0xb4dd2a07c271ba3645cfcfc9b25e6d33aa83bec0d69db14fe5b5e5e34e1c4a20",
};

export async function xlpt(timestamp: number = 0): Promise<Write[]> {
  await setEnvSecrets();
  const pricesObject: any = {};
  await Promise.all(
    Object.keys(assets).map(async (symbol) => {
      const res = await fetch(`https://api.mainnet.aptoslabs.com/v1/view`, {
        method: "POST",
        body: JSON.stringify({
          function:
            "0xff9c14f0ab345b7804388d93401f5f0651f29dff7082bf386eea9b7a695c769e::oracle::get_price",
          type_arguments: [],
          arguments: [assets[symbol]],
        }),
        headers: {
          "content-type": "application/json",
        },
      }).then((r) => r.json());

      if (!res.length) return;
      const price = res[0].v / 2 ** 64;
      pricesObject[assets[symbol]] = {
        underlying: `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b`,
        price,
        symbol,
        decimals: 8,
      };
    }),
  );

  return getWrites({
    chain: "aptos",
    timestamp,
    pricesObject,
    projectName: "xLPT",
  });
}

xlpt(); // ts-node coins/src/adapters/markets/xlpt.ts
