import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/getReserves";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';

const adapter: IPoRAdapter = {
  assetLabel: 'LBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = await bitcoinAddressBook.lombard();
    return await getReserves(options, {
      ethereum: {
        minted: [
          {
            address: '0x8236a87084f8B84306f72007F36F2618A5634494',
          },
        ],
      },
      base: {
        minted: [
          {
            address: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
          },
        ],
      },
      bsc: {
        minted: [
          {
            address: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
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

