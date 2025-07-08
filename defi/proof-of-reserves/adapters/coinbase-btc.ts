import { GetPoROptions } from '../types';
import { getTotalMinted } from '../utils/getReserves';
import { getBTCPriceUSD, getLlamaTvl } from '../utils/llamaApis';

const protocolId = 'coinbase-btc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  },
  {
    chain: 'base',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  },
  {
    chain: 'arbitrum',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  },
  {
    chain: 'solana',
    address: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
    decimals: 8,
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





