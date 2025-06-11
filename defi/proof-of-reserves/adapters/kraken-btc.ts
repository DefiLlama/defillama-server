import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/adapter";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';

const adapter: IPoRAdapter = {
  assetLabel: 'kBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = bitcoinAddressBook.krakenBTC;
    return await getReserves(options, {
      ethereum: {
        minted: [{address: '0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98'}],
      },
      optimism: {
        minted: [{address: '0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98'}],
      },
      ink: {
        minted: [{address: '0x73E0C0d45E048D25Fc26Fa3159b0aA04BfA4Db98'}],
      },
      unichain: {
        minted: [{address: '0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98'}],
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
