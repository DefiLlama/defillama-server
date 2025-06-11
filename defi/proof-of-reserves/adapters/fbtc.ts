import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/adapter";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';

const adapter: IPoRAdapter = {
  assetLabel: 'FBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = await bitcoinAddressBook.fbtc();
    return await getReserves(options, {
      ethereum: {
        minted: [
          {
            address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
          },
        ],
      },
      mantle: {
        minted: [
          {
            address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
          },
        ],
      },
      arbitrum: {
        minted: [
          {
            address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
          },
        ],
      },
      bob: {
        minted: [
          {
            address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
          },
        ],
      },
      bsc: {
        minted: [
          {
            address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
          },
        ],
      },
      base: {
        minted: [
          {
            address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
          },
        ],
      },
      berachain: {
        minted: [
          {
            address: '0xbAC93A69c62a1518136FF840B788Ba715cbDfE2B',
          },
        ],
      },
      sonic: {
        minted: [
          {
            address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
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


