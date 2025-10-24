import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'solv-others';

const mintedTokens = [
  {
    chain: 'merlin',
    address: '0x41D9036454BE47d3745A823C4aaCD0e29cFB0f71',
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
