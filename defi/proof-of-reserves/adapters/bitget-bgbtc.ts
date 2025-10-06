import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'bitget-bgBTC';

const mintedTokens = [
  { chain: 'ethereum', address: '0x0520930F21b14Cafac7a27b102487beE7138a017' },
  { chain: 'hemi', address: '0x5B6d6D09F425da2a816D1cDBabd049449Ae8d8e6' },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
