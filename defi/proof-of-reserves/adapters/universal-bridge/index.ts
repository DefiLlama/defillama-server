import { GetPoROptions, TokenConfig } from '../../types';
import { getTotalMinted } from '../../utils/getReserves';
import { getLlamaTvl } from '../../utils/llamaApis';

const protocolId = 'universal-bridge';

const mintedTokens: Array<TokenConfig> = [
  {
    chain: 'base',
    address: '0xa3A34A0D9A08CCDDB6Ed422Ac0A28a06731335aA',
  },
  {
    chain: 'polygon',
    address: '0xa3A34A0D9A08CCDDB6Ed422Ac0A28a06731335aA',
    llamaCoinPriceId: 'base:0xa3A34A0D9A08CCDDB6Ed422Ac0A28a06731335aA',
  },
  {
    chain: 'wc',
    address: '0xa3A34A0D9A08CCDDB6Ed422Ac0A28a06731335aA',
    llamaCoinPriceId: 'base:0xa3A34A0D9A08CCDDB6Ed422Ac0A28a06731335aA',
  },
  {
    chain: 'katana',
    address: '0xa3A34A0D9A08CCDDB6Ed422Ac0A28a06731335aA',
    llamaCoinPriceId: 'base:0xa3A34A0D9A08CCDDB6Ed422Ac0A28a06731335aA',
  },
]

export default {
  protocolId: protocolId,
  minted: async function(_: GetPoROptions): Promise<number> {
    return await getTotalMinted(mintedTokens, true);
  },
  reserves: async function(): Promise<number> {
    return await getLlamaTvl(protocolId);
  },
}
