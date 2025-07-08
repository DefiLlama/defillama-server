import { GetPoROptions } from '../types';
import { getTotalMinted } from '../utils/getReserves';
import { getBTCPriceUSD, getLlamaTvl } from '../utils/llamaApis';

const protocolId = 'pumpbtc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0xf469fbd2abcd6b9de8e169d128226c0fc90a012e',
  },
  {
    chain: 'bsc',
    address: '0xf9C4FF105803A77eCB5DAE300871Ad76c2794fa4',
  },
  {
    chain: 'mantle',
    address: '0xc75d7767f2edfbc6a5b18fc1fa5d51ffb57c2b37',
  },
  {
    chain: 'bob',
    address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E',
  },
  {
    chain: 'base',
    address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e',
  },
  {
    chain: 'arbitrum',
    address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e',
  },
  {
    chain: 'morph',
    address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E',
  },
  {
    chain: 'sei',
    address: '0xb45aB56AafB1fFb21eE36C9Dee3B7D8ec5779fC8',
  },
  {
    chain: 'avax',
    address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E',
  },
  {
    chain: 'zircuit',
    address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e',
  },
  {
    chain: 'optimism',
    address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e',
  },
  {
    chain: 'soneium',
    address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E',
  },
  {
    chain: 'hemi',
    address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e',
  },
  {
    chain: 'klaytn',
    address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E',
  },
  {
    chain: 'ink',
    address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E',
  },
  {
    chain: 'core',
    address: '0x5a2aa871954eBdf89b1547e75d032598356caad5',
  },
  {
    chain: 'corn',
    address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e',
  },
  {
    chain: 'zeta',
    address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E',
  },
  {
    chain: 'zklink',
    address: '0xDAB5cD46A968aDb6911613896fC61b8B62Cf3B2C',
  },
  {
    chain: 'linea',
    address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e',
  },
  {
    chain: 'taiko',
    address: '0xDBc80A09dE9b075f9380801De2030B3467e3B8FA',
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
