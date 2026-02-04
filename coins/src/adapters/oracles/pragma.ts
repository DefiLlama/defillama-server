import { getCurrentUnixTimestamp } from "../../utils/date";
import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import fetch from "node-fetch";

type Feed = { id: string; symbol: string; address: string; decimals: number };

const feeds: Feed[] = [
  {
    id: "0x585354524b2f555344",
    symbol: "xSTRK",
    address:
      "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
    decimals: 18,
  },
  {
    id: "0x535354524b2f555344",
    symbol: "sSTRK",
    address:
      "0x0356f304b154d29d2a8fe22f1cb9107a9b564a733cf6b4cc47fd121ac1af90c9",
    decimals: 18,
  },
]; // hex strings of ref from https://docs.pragma.build/v1/Resources/data-feeds/supported-assets

export async function pragma(timestamp: number = 0) {
  const THREE_DAYS = 3 * 24 * 60 * 60;
  const now = getCurrentUnixTimestamp();
  const threeDaysAgo = (timestamp ? timestamp : now) - THREE_DAYS;

  const writes: Write[] = [];
  await Promise.all(
    feeds.map(async ({ id, symbol, address, decimals }: Feed) => {
      const res = await fetch(
        process.env.STARKNET_RPC ??
          "https://starknet-mainnet.public.blastapi.io",
        {
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "starknet_call",
            params: {
              request: {
                contract_address:
                  "0x2a85bd616f912537c50a49a4076db02c00b29b2cdc8a197ce92ed1837fa875b",
                entry_point_selector:
                  "0x24b869ce68dd257b370701ca16e4aaf9c6483ff6805d04ba7661f3a0b6ce59",
                calldata: ["0x0", id],
              },
              block_id: "pending",
            },
          }),
          method: "POST",
        },
      ).then((r) => r.json());

      const [price, offset, publishTime, sources] = res.result.map(
        (r: string) => parseInt(r.substring(2), 16),
      );

      if (publishTime < threeDaysAgo || sources == 1) return;

      addToDBWritesList(
        writes,
        "starknet",
        address,
        price / 10 ** offset,
        decimals,
        symbol,
        timestamp,
        "pragma",
        0.9,
      );
    }),
  );

  return writes;
}
