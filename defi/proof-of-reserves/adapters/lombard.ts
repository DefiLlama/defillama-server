import { GetPoROptions, IPoRAdapter } from "../types";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';
import { sumTokens } from '../../DefiLlama-Adapters/projects/helper/chain/bitcoin';
import * as sdk from '@defillama/sdk';

// count issued LBTC on ethereum, bsc, ans base
const LBTC: any = {
  ethereum: '0x8236a87084f8B84306f72007F36F2618A5634494',
  bsc: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  base: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
}

const adapter: IPoRAdapter = {
  minted: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    let balance = 0;
    for (const [chain, address] of Object.entries(LBTC)) {
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
    const addresses = await bitcoinAddressBook.lombard();
    const bitcoinBalances = await sumTokens({ owners: addresses, forceCacheUse: true } as any)
    return {BTC: (bitcoinBalances as any).bitcoin ? Number((bitcoinBalances as any).bitcoin) : 0};
  },
}

export default adapter;
