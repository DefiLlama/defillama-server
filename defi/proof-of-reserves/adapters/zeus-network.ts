import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'zeus-network';

const mintedTokens = [
  {
    chain: 'solana',
    address: 'zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg',
    decimals: 8,
  }
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
