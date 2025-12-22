import { calculate4626Prices } from "../../utils/erc4626";
import { tokens } from "./tokens";

export default async function getTokenPrices(chain: string, timestamp: number) {
  const tokens4626 = Object.values((tokens as any)[chain] || {}) as string[];
  return calculate4626Prices(chain, timestamp, tokens4626, "snowbl-capital");
}
