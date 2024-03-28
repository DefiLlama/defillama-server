import fetch from "node-fetch";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";

export default async function getTokenPrice(timestamp: number) {
  if (timestamp != 0) return [];
  const writes: Write[] = [];

  const [rate, underlyingData] = await Promise.all([
    (await fetch("https://vestadex.com/api/price?pair=VEGLD,EGLD")).json(),
    getTokenAndRedirectData(["WEGLD-bd4d79"], "elrond", timestamp),
  ]);

  addToDBWritesList(
    writes,
    "VEGLD-2b9319",
    "elrond",
    rate.price * underlyingData[0].price,
    18,
    "VEGLD",
    timestamp,
    "sweth",
    1,
  );

  return writes;
}
