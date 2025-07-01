import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/getReserves";
import bitcoinAddressBook from '@defillama/adapters/projects/helper/bitcoin-book';

const adapter: IPoRAdapter = {
  assetLabel: 'BTC.b',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = bitcoinAddressBook.avalanche;
    return await getReserves(options, {
      avax: {
        minted: [{address: '0x152b9d0FdC40C096757F570A51E494bd4b943E50'}],
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
