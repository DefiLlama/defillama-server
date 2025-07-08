import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'hemibtc';

const mintedTokens = [
  {
    chain: 'hemi',
    address: '0xAA40c0c7644e0b2B224509571e10ad20d9C4ef28',
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
