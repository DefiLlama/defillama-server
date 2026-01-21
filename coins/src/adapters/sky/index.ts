import { calculate4626Prices } from "../utils/erc4626";

const stUSDS = "0x99CD4Ec3f88A45940936F469E4bB72A2A701EEB9";

export async function sky(timestamp: number = 0) {
  return calculate4626Prices("ethereum", timestamp, [stUSDS], "sky");
}

export const adapters = {
  sky,
};
