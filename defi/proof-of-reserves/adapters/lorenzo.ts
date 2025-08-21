import { getBitcoinReservesAdapter } from '../utils/bitcoin';

// lorenzo stBTC
const protocolId = 'lorenzo';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0xf6718b2701d4a6498ef77d7c152b2137ab28b8a3',
  },
  {
    chain: 'bsc',
    address: '0xf6718b2701d4a6498ef77d7c152b2137ab28b8a3',
  },
  {
    chain: 'btr',
    address: '0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3',
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens, ['0x964e289Ffb1D0447eA4270FCD6b974A7aD588751']);
