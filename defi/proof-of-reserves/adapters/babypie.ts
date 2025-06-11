import { GetPoROptions, IPoRAdapter } from "../types";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';
import { sumTokens } from '../../DefiLlama-Adapters/projects/helper/chain/bitcoin';
import * as sdk from '@defillama/sdk';

const issuesTokens = {
  ethereum: '0xbdf245957992bfbc62b07e344128a1eec7b7ee3f',
  bsc: '0x7c1cca5b25fa0bc9af9275fb53cba89dc172b878',
  arbitrum: '0x2172fad929e857ddfd7ddc31e24904438434cb0b',
  zircuit: '0x7FdFbE1fB9783745991CFb0a3D396acE6eE0c909',
};

const adapter: IPoRAdapter = {
  minted: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    let balance = 0;
    for (const [chain, address] of Object.entries(issuesTokens)) {
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
    const addresses = bitcoinAddressBook.magpie;
    const bitcoinBalances = await sumTokens({ owners: addresses, forceCacheUse: true } as any)
    return {BTC: (bitcoinBalances as any).bitcoin ? Number((bitcoinBalances as any).bitcoin) : 0};
  },
}

export default adapter;
