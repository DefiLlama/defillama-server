import { GetPoROptions, IPoRAdapter } from "../types";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';
import { sumTokens } from '../../DefiLlama-Adapters/projects/helper/chain/bitcoin';
import * as sdk from '@defillama/sdk';

const issuedTokens = {
  ethereum: '0xe7ae30c03395d66f30a26c49c91edae151747911',
  optimism: '0x1792865d493fe4dfdd504010d3c0f6da11e8046d',
  base: '0x8d2757ea27aabf172da4cca4e5474c76016e3dc5',
  arbitrum: '0x1792865d493fe4dfdd504010d3c0f6da11e8046d',
};

const adapter: IPoRAdapter = {
  minted: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    let balance = 0;
    for (const [chain, address] of Object.entries(issuedTokens)) {
      const supply = await sdk.api2.abi.call({
        chain: chain,
        target: address as string,
        abi: 'uint256:totalSupply',
      });
      balance += Number(supply) / 1e18;
    }
    return {BTC: balance};
  },
  unrelaesed: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    const addresses = bitcoinAddressBook.cygnus;
    const bitcoinBalances = await sumTokens({ owners: addresses, forceCacheUse: true } as any)
    return {BTC: (bitcoinBalances as any).bitcoin ? Number((bitcoinBalances as any).bitcoin) : 0};
  },
}

export default adapter;
