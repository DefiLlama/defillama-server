import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'wbtc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  }
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
