import { GetPoROptions, IPoRAdapter } from "../types";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';
import { sumTokens } from '../../DefiLlama-Adapters/projects/helper/chain/bitcoin';
import * as sdk from '@defillama/sdk';

const iBTC = {
  ethereum: '0x20157dbabb84e3bbfe68c349d0d44e48ae7b5ad2',
  arbitrum: '0x050c24dbf1eec17babe5fc585f06116a259cc77a',
  optimism: '0x2baa7e92f3f14883264bfa63058cc223ad719438',
  base: '0x12418783e860997eb99e8aCf682DF952F721cF62',
  avax: '0x25be3edd820a8fce6b8e211f40c5b82ba176994c',
  bsc: '0x25be3edd820a8fce6b8e211f40c5b82ba176994c',
};

const adapter: IPoRAdapter = {
  minted: async function(_: GetPoROptions): Promise<{[key: string]: number}> {
    let balance = 0;
    for (const [chain, address] of Object.entries(iBTC)) {
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
    const addresses = await bitcoinAddressBook.dlcLink();
    const bitcoinBalances = await sumTokens({ owners: addresses, forceCacheUse: true } as any)
    return {BTC: (bitcoinBalances as any).bitcoin ? Number((bitcoinBalances as any).bitcoin) : 0};
  },
}

export default adapter;
