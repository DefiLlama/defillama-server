import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/getReserves";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';

const adapter: IPoRAdapter = {
  assetLabel: 'hemiBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = bitcoinAddressBook.hemiBTC;
    return await getReserves(options, {
      hemi: {
        minted: [
          {
            address: '0xAA40c0c7644e0b2B224509571e10ad20d9C4ef28',
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

