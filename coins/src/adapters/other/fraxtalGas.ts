import { nullAddress } from "../../utils/shared/constants";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";

export async function fraxtalGas(timestamp: number = 0) {
  const redirect =
    timestamp != 0 && timestamp < 1745949877 ? "frax-ether" : "frax-share";

  const data = await getTokenAndRedirectDataMap(
    [redirect],
    "coingecko",
    timestamp,
  );

  if (!(`coingecko#${redirect}` in data))
    throw new Error(`no redirect data for fraxtalGas ${timestamp}`);

  const writes: Write[] = [];
  const { price, symbol, confidence } = data[`coingecko#${redirect}`];
  addToDBWritesList(
    writes,
    "fraxtal",
    nullAddress,
    price,
    18,
    symbol,
    timestamp,
    "fraxtal-gas",
    confidence ?? 1,
  );

  return writes;
}
