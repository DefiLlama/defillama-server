import { GetPoROptions, TokenConfig } from '../../types';
import { getTotalMinted } from '../../utils/getReserves';
import { getLlamaTvl } from '../../utils/llamaApis';
import mintedTokens from './tokens';

const protocolId = 'universal-bridge';

export default {
  protocolId: protocolId,
  minted: async function(_: GetPoROptions): Promise<number> {
    return await getTotalMinted(mintedTokens, true);
  },
  reserves: async function(): Promise<number> {
    return await getLlamaTvl(protocolId);
  },
}
