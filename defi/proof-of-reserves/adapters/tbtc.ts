import { GetPoROptions, IPoRAdapter } from "../types";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';
import { sumTokens } from '../../DefiLlama-Adapters/projects/helper/chain/bitcoin';
import * as sdk from '@defillama/sdk';

// count issued tBTC on ethereum
const tBTC = '0x18084fbA666a33d37592fA2633fD49a74DD93a88';

const adapter: IPoRAdapter = {
  minted: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    const supply = await sdk.api2.abi.call({
      chain: 'ethereum',
      target: tBTC,
      abi: 'uint256:totalSupply',
    });
    return {BTC: Number(supply) / 1e18};
  },
  unrelaesed: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    const addresses = await bitcoinAddressBook.tBTC();
    const bitcoinBalances = await sumTokens({ owners: addresses, forceCacheUse: true } as any)
    return {BTC: (bitcoinBalances as any).bitcoin ? Number((bitcoinBalances as any).bitcoin) : 0};
  },
}

export default adapter;
