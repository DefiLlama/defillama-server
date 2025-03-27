import { unwrap4626 } from "../mean-finance/mean-finance";
import tokens from "./tokens.json";

export default async function getTokenPrices(chain: string, timestamp: number) {
  const tokens4626: string[] = Object.values((tokens as any)[chain]);
  return unwrap4626(chain, tokens4626, timestamp, "misc4626");
}
