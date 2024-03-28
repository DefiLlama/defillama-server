import { getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

async function getTokenPrices(timestamp: number) {
  const api = await getApi("meter", timestamp);
  const target = "0xe2de616fbd8cb9180b26fcfb1b761a232fe56717";
  const rate = await api.call({
    target,
    abi: {
      inputs: [],
      name: "stMTRGPerToken",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  });
  const mtrg = await getTokenAndRedirectData(
    ["0xbd2949f67dcdc549c6ebe98696449fa79d988a9f"],
    "bsc",
    timestamp,
  );
  const pricesObject: any = {
    [target]: { price: (rate * mtrg[0].price) / 1e18 },
  };
  const writes: Write[] = [];
  return getWrites({
    chain: "meter",
    timestamp,
    writes,
    pricesObject,
    projectName: "wstmtrg",
  });
}

export function wstmtrg(timestamp: number = 0) {
  console.log("starting wstMTRG");
  return getTokenPrices(timestamp);
}
