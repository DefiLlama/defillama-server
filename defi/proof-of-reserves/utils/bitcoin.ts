import { GetPoROptions, IPoRAdapter, TokenConfig } from "../types";
import { getTotalMinted } from "./getReserves";
import { getBTCPriceUSD, getLlamaTvl } from "./llamaApis";

export function getBitcoinReservesAdapter(protocolId: string, mintedTokens: Array<TokenConfig>): IPoRAdapter {
  return {
    protocolId: protocolId,
    minted: async function(_: GetPoROptions): Promise<number> {
      const totalMinted = await getTotalMinted(mintedTokens);
      return totalMinted * (await getBTCPriceUSD());
    },
    reserves: async function(): Promise<number> {
      return await getLlamaTvl(protocolId);
    },
  }
}
