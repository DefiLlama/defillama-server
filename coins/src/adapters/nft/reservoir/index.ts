import { Write } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { getApi } from "../../utils/sdk";
import axios from "axios";
import { log } from "@defillama/sdk";

const chain = "ethereum";
export async function reservoir(timestamp: number = 0) {
  const api = await getApi(chain, timestamp);
  const collections = await getCollections();
  const [{ price: ethPrice }] = await getTokenAndRedirectData(
    ["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"],
    chain,
    timestamp,
  );
  const writes: Write[] = [];
  const symbols = await api.multiCall({
    abi: "string:symbol",
    calls: collections.map((i: any) => i.contract),
    permitFailure: true,
  });

  const symbolFromName = (i: string) =>
    i
      .split("by ")[0]
      .split("(")[0]
      .trim()
      .replace(/\s+'?\s*/g, "-")
      .toUpperCase();
  let res: any = {};
  symbols.forEach(
    (_, i) =>
      (res[collections[i].collectionId.toLowerCase()] =
        collections[i].floorAskPrice),
  );
  collections.forEach((item: any, i: number) => {
    let symbol = symbols[i];

    if (!symbol || item.collectionId.includes(":")) {
      symbol = symbolFromName(item.name);
    }

    addToDBWritesList(
      writes,
      chain,
      item.collectionId.toLowerCase(),
      ethPrice * item.floorAskPrice,
      0,
      symbol,
      timestamp,
      "reservoir",
      0.9,
    );
  });

  return writes.filter(
    (
      w: Write, // PANDORA
    ) => w.PK != "asset#ethereum:0x9e9fbde7c7a83c43913bddc8779158f1368f0413",
  );
}

async function getCollections({ limit = 5000 } = {}) {
  const collections = [];
  let res;
  do {
    let url = `https://api.reservoir.tools/search/collections/v1?limit=1000`;
    if (collections.length) url += `&offset=${collections.length}`;
    res = await axios.get(url);
    collections.push(...res.data.collections);
  } while (res.data.collections.length && collections.length < limit);
  return filterCollections(collections);
}

function filterCollections(collections: any) {
  const floorAskPrice = (i: any) => i.floorAskPrice > 0.2;
  const openseaVerificationStatus = (i: any) =>
    i.openseaVerificationStatus === "verified";
  const allTimeVolume = (i: any) => i.allTimeVolume > 1000;
  return (
    collections
      // .filter(openseaVerificationStatus)
      .filter(floorAskPrice)
      .filter(allTimeVolume)
  );
}
