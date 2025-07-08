import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'core-bitcoin-bridge';

const mintedTokens = [
  {
    chain: 'avax',
    address: '0x152b9d0FdC40C096757F570A51E494bd4b943E50',
  }
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
