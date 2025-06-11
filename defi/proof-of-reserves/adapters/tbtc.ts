import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/adapter";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';

const adapter: IPoRAdapter = {
  assetLabel: 'tBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = await bitcoinAddressBook.tBTC();
    return await getReserves(options, {
      ethereum: {
        minted: [
          {
            address: '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
          },
        ],
      },
      bitcoin: {
        reserves: {
          owners: addresses,
        }
      },
    })
  }
}

export default adapter;
