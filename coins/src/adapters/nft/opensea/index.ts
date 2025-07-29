import { Write } from "../../utils/dbInterfaces";
import { fetch } from "../../utils";
import { getCurrentUnixTimestamp } from "../../../utils/date";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../../utils/database";

const collections: { [chain: string]: { [collection: string]: string } } = {
  arbitrum: {
    "aethir-checker-license": "0xc227e25544edd261a9066932c71a25f4504972f1",
  },
};

async function getCollectionPrice(
  timestamp: number,
  chain: string,
  collection: string,
) {
  const address = collections[chain][collection];
  const dateTime = new Date(
    (timestamp == 0 ? getCurrentUnixTimestamp() : timestamp) * 1000,
  ).toISOString();

  const { orders } = await fetch(
    `https://api.opensea.io//api/v2/orders/${chain}/seaport/offers?asset_contract_address=${address}&limit=50&listed_before=${dateTime}`,
    {
      headers: {
        "x-api-key": process.env.OPENSEA_API_KEY,
        accept: "application/json",
      },
    },
  );

  if (!orders.length) return [];

  const bidValues: any[] = [];
  const bidAssets: string[] = [];
  orders.map(
    ({
      cancelled,
      expiration_time,
      side,
      current_price,
      maker_asset_bundle,
    }: any) => {
      if (cancelled) return;
      if (side != "bid") return;
      if (expiration_time < timestamp) return;

      const asset = maker_asset_bundle.assets[0].asset_contract.address;
      bidValues.push({
        asset,
        current_price,
      });

      if (!bidAssets.includes(asset.toLowerCase()))
        bidAssets.push(asset.toLowerCase());
    },
  );

  const bidAssetsPrices = await getTokenAndRedirectDataMap(
    bidAssets,
    chain,
    timestamp,
  );

  let price = 0;
  bidValues.map(({ asset, current_price }) => {
    const token = bidAssetsPrices[asset.toLowerCase()];
    if (!token) return;
    const bidUsdValue = (token.price * current_price) / 10 ** token.decimals;
    price = Math.max(price, bidUsdValue);
  });

  if (price == 0) return [];

  const writes: Write[] = [];
  addToDBWritesList(
    writes,
    chain,
    address,
    price,
    0,
    collection,
    timestamp,
    "opensea",
    0.9,
  );

  return writes;
}

export async function opensea(timestamp: number) {
  const promises: Promise<Write[]>[] = [];

  Object.keys(collections).map((chain) => {
    Object.keys(collections[chain]).map((collection) =>
      promises.push(getCollectionPrice(timestamp, chain, collection)),
    );
  });

  return Promise.all(promises);
}
