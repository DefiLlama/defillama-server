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

  const time = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const { asset_events } = await fetch(
    `https://api.opensea.io/api/v2/events/collection/${collection}?event_type=sale&limit=50&before=${time}`,
    {
      headers: {
        "x-api-key": process.env.OPENSEA_API_KEY,
        accept: "application/json",
      },
    },
  );

  if (!asset_events.length) return [];

  const {
    payment: { token_address, quantity },
    event_timestamp,
  } = asset_events[0];

  if (time - event_timestamp > 60 * 60 * 24) return [];

  const bidAssetValue = await getTokenAndRedirectDataMap(
    [token_address],
    chain,
    timestamp,
  );

  const token = bidAssetValue[token_address.toLowerCase()];
  if (!token) return [];

  const price = (token.price * quantity) / 10 ** token.decimals;
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
