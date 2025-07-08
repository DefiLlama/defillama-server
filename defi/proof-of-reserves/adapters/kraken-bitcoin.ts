import { GetPoROptions } from '../types';
import { getTotalMinted } from '../utils/getReserves';
import { getBTCPriceUSD, getLlamaTvl } from '../utils/llamaApis';

const protocolId = 'kraken-bitcoin';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98',
  },
  {
    chain: 'optimism',
    address: '0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98',
  },
  {
    chain: 'ink',
    address: '0x73E0C0d45E048D25Fc26Fa3159b0aA04BfA4Db98',
  },
  {
    chain: 'unichain',
    address: '0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98',
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
