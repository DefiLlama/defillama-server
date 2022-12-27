import { unwrap4262 } from "../mean-finance/mean-finance";
import tokens from "./tokens.json";

export default async function getTokenPrices(chain: string, timestamp: number) {
  const tokens4626: string[] = Object.values(
    tokens[chain as keyof typeof tokens]
  );
  return await unwrap4262(chain, tokens4626, timestamp, "misc4262");
}
