import { GetPoROptions } from '../types';
import { getTotalMinted } from '../utils/getReserves';
import { getLlamaTvl } from '../utils/llamaApis';

const protocolId = 'coinbase-ltc';

const mintedTokens = [
  {
    chain: 'base',
    address: '0xcb17C9Db87B595717C857a08468793f5bAb6445F',
  },
]

export default {
  protocolId: protocolId,
  whitelisted: true,
  minted: async function(_: GetPoROptions): Promise<number> {
    return await getTotalMinted(mintedTokens, true);
  },
  reserves: async function(): Promise<number> {
    return await getLlamaTvl(protocolId);
  },
};
