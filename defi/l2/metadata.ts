import { Chain } from "@defillama/sdk/build/general";

export async function metadata(chain: Chain) {
  return { chain };
}
