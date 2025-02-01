import { calculate4626Prices } from "../../utils/erc4626";
import { fetch } from "../../utils";

export default async function getTokenPrices(chain: string, timestamp: number) {
  const tokens4626 = ["0xfa85fe5a8f5560e9039c04f2b0a90de1415abd70"]; //$wanS
  return await unwrap4626(chain, tokens4626, timestamp, "angles");
}

export async function unwrap4626(
  chain: string,
  tokens: string[],
  timestamp: number,
  adapter: string,
) {
  return calculate4626Prices(chain, timestamp, tokens, adapter)
}
