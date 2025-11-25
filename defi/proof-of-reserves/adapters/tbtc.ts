import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'tbtc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
  }
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
