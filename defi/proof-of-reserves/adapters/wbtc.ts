import { GetPoROptions, IPoRAdapter } from "../types";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';
import { sumTokens } from '../../DefiLlama-Adapters/projects/helper/chain/bitcoin';
import * as sdk from '@defillama/sdk';

// count issued WBTC on ethereum
const WBTC: any = {
  ethereum: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
}

const adapter: IPoRAdapter = {
  minted: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    let balance = 0;
    for (const [chain, address] of Object.entries(WBTC)) {
      const supply = await sdk.api2.abi.call({
        chain: chain,
        target: address as string,
        abi: 'uint256:totalSupply',
      });
      balance += Number(supply) / 1e8;
    }
    return {BTC: balance};
  },
  unrelaesed: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    const addresses = bitcoinAddressBook.wbtc;
    const bitcoinBalances = await sumTokens({ owners: addresses, forceCacheUse: true } as any)
    return {BTC: (bitcoinBalances as any).bitcoin ? Number((bitcoinBalances as any).bitcoin) : 0};
  },
}

export default adapter;
