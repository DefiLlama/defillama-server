import { getCurrentUnixTimestamp } from "../../utils/date";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const chain = "ethereum";
const target = "0x7c07f7abe10ce8e33dc6c5ad68fe033085256a84";

export async function icETH(timestamp: number): Promise<Write[]> {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);

  const positions = await api.call({
    abi: "function getPositions() external view returns (tuple(address component, address module, int256 unit, uint8 positionState, bytes data)[])",
    target,
  });

  const pricingData = await getTokenAndRedirectDataMap(
    positions.map((p: any) => p.component),
    chain,
    timestamp,
  );

  let price: number = 0;
  positions.map((p: any) => {
    const tokenInfo = pricingData[p.component.toLowerCase()];
    if (!tokenInfo)
      throw new Error(`missing pricing data for an icETH component`);

    price += (tokenInfo.price * p.unit) / 10 ** tokenInfo.decimals;
  });

  const confidence = Math.min(
    0.95,
    ...(Object.values(pricingData).map((d) => d.confidence) as any),
  );

  const writes: Write[] = [];
  addToDBWritesList(
    writes,
    chain,
    target,
    price,
    18,
    "icETH",
    timestamp,
    "icETH",
    confidence,
  );

  return writes;
}
