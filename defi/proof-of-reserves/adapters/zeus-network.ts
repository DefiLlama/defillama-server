import { GetPoROptions, IPoRAdapter } from "../types";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';
import { sumTokens } from '../../DefiLlama-Adapters/projects/helper/chain/bitcoin';
import { getTokenSupplies } from '../../DefiLlama-Adapters/projects/helper/solana';

// count issued zBTC on solana
const zBTC = 'zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg';

const adapter: IPoRAdapter = {
  minted: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    const supply: any = await getTokenSupplies([zBTC])
    console.log(supply)
    return {BTC: Number(supply[zBTC]) / 1e8};
  },
  unrelaesed: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    const addresses = bitcoinAddressBook.zeusZBTC;
    const bitcoinBalances = await sumTokens({ owners: addresses, forceCacheUse: true } as any)
    return {BTC: (bitcoinBalances as any).bitcoin ? Number((bitcoinBalances as any).bitcoin) : 0};
  },
}

export default adapter;
