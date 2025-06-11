import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/getReserves";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';

const adapter: IPoRAdapter = {
  assetLabel: 'cbBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = bitcoinAddressBook.coinbasebtc;
    return await getReserves(options, {
      ethereum: {
        minted: [
          {
            address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
          },
        ],
      },
      base: {
        minted: [
          {
            address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
          },
        ],
      },
      arbitrum: {
        minted: [
          {
            address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
          },
        ],
      },
      solana: {
        minted: [
          {
            address: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
            decimals: 8,
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


