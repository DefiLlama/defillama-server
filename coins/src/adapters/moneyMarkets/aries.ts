import { Write } from "../utils/dbInterfaces";
import fetch from "node-fetch";
import { addToDBWritesList } from "../utils/database";
import setEnvSecrets from "../../utils/shared/setEnvSecrets";

const chain = "aptos";
const url = "https://api-v2.ariesmarkets.xyz/coinInfo.currentInfo";

export async function aries(timestamp: number = 0) {
  await setEnvSecrets();
  if (timestamp != 0)
    throw new Error(`Aries adapter only works for current time`);
  const writes: Write[] = [];
  const priceRes = await fetch(url).then((r) => r.json());

  await Promise.all(
    Object.keys(priceRes.result.data).map(async (t) => {
      const metadataRes = await fetch(
        `${process.env.APTOS_RPC}/v1/accounts/${t.substring(
          0,
          t.indexOf("::"),
        )}/resource/0x1::coin::CoinInfo%3C${t}%3E`,
      ).then((r) => r.json());

      const { price } = priceRes?.result?.data[t];
      const { symbol, decimals } = metadataRes?.data;

      if (!price || !symbol || !decimals) return;

      addToDBWritesList(
        writes,
        chain,
        t,
        price,
        decimals,
        symbol,
        timestamp,
        "aries",
        0.8,
      );
    }),
  );

  return writes;
}
