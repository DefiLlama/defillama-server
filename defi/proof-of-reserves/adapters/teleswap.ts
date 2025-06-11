import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/adapter";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';

const adapter: IPoRAdapter = {
  assetLabel: 'TELEBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = bitcoinAddressBook.teleswap;
    return await getReserves(options, {
      bsc: {
        minted: [
          {
            address: '0xC58C1117DA964aEbe91fEF88f6f5703e79bdA574',
          },
        ],
      },
      polygon: {
        minted: [
          {
            address: '0x3BF668Fe1ec79a84cA8481CEAD5dbb30d61cC685',
          },
        ],
      },
      bsquared: {
        minted: [
          {
            address: '0x05698eaD40cD0941e6E5B04cDbd56CB470Db762A',
          },
        ],
      },
      bob: {
        minted: [
          {
            address: '0x0670bEeDC28E9bF0748cB254ABd946c87f033D9d',
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


