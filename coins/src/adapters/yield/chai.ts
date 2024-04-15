import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const pot = "0x197E90f9FAD81970bA7976f33CbD77088E5D7cf7";

const chain = "ethereum";
const token = "0x06AF07097C9Eeb7fD685c692751D5C66dB49c215";
const decimals = 18;
const symbol = "CHAI";

export async function chai(timestamp = 0) {
  console.log("starting chai");

  const [daiData] = await getTokenAndRedirectData([dai], chain, timestamp);

  const api = await getApi(chain, timestamp);
  const chi = await api.call({
    target: pot,
    abi: "function chi() view returns (uint256)",
  });

  const price = daiData.price * (chi / 1e27);
  const confidence = 0.98;

  const writes: Write[] = [];
  addToDBWritesList(
    writes,
    chain,
    token,
    price,
    decimals,
    symbol,
    timestamp,
    "chai",
    confidence,
  );

  return writes;
}
