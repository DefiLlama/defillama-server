import { GetPoROptions } from '../types';
import { getTotalMinted } from '../utils/getReserves';
import { getBTCPriceUSD, getLlamaTvl } from '../utils/llamaApis';

const protocolId = 'ibtc-network';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x20157dbabb84e3bbfe68c349d0d44e48ae7b5ad2',
  },
  {
    chain: 'base',
    address: '0x12418783e860997eb99e8aCf682DF952F721cF62',
  },
  {
    chain: 'arbitrum',
    address: '0x050c24dbf1eec17babe5fc585f06116a259cc77a',
  },
  {
    chain: 'optimism',
    address: '0x2baa7e92f3f14883264bfa63058cc223ad719438',
  },
  {
    chain: 'avax',
    address: '0x25be3edd820a8fce6b8e211f40c5b82ba176994c',
  },
  {
    chain: 'bsc',
    address: '0x25be3edd820a8fce6b8e211f40c5b82ba176994c',
  },
]

export default {
  protocolId: protocolId,
  minted: async function(_: GetPoROptions): Promise<number> {
    const totalMinted = await getTotalMinted(mintedTokens);
    return totalMinted * (await getBTCPriceUSD());
  },
  reserves: async function(): Promise<number> {
    return await getLlamaTvl(protocolId);
  },
}



