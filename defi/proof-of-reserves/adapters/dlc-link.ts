import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/getReserves";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';

const adapter: IPoRAdapter = {
  assetLabel: 'iBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = await bitcoinAddressBook.dlcLink();
    return await getReserves(options, {
      ethereum: {
        minted: [
          {
            address: '0x20157dbabb84e3bbfe68c349d0d44e48ae7b5ad2',
          },
        ],
      },
      arbitrum: {
        minted: [
          {
            address: '0x050c24dbf1eec17babe5fc585f06116a259cc77a',
          },
        ],
      },
      optimism: {
        minted: [
          {
            address: '0x2baa7e92f3f14883264bfa63058cc223ad719438',
          },
        ],
      },
      base: {
        minted: [
          {
            address: '0x12418783e860997eb99e8aCf682DF952F721cF62',
          },
        ],
      },
      avax: {
        minted: [
          {
            address: '0x25be3edd820a8fce6b8e211f40c5b82ba176994c',
          },
        ],
      },
      bsc: {
        minted: [
          {
            address: '0x25be3edd820a8fce6b8e211f40c5b82ba176994c',
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


