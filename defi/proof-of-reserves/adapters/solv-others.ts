import { GetPoROptions } from '../types';
import { getTotalMinted } from '../utils/getReserves';
import { getBTCPriceUSD, getLlamaTvl } from '../utils/llamaApis';

const protocolId = 'solv-others';

const mintedTokens = [
  {
    chain: 'merlin',
    address: '0x41D9036454BE47d3745A823C4aaCD0e29cFB0f71',
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
