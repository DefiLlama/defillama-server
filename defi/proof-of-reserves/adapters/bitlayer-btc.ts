import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/getReserves";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';

const adapter: IPoRAdapter = {
  assetLabel: 'Bitlayer BTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = bitcoinAddressBook.bitlayerBridge;
    return await getReserves(options, {
      btr: {
        minted: [
          {
            address: '0xff204e2681a6fa0e2c3fade68a1b28fb90e4fc5f',
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


