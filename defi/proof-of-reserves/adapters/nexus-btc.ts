import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'nexus-btc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x8bb97a618211695f5a6a889fac3546d1a573ea77',
  },
  {
    chain: 'core',
    address: '0x8bb97a618211695f5a6a889fac3546d1a573ea77',
  },
  {
    chain: 'hemi',
    address: '0xC93B7aae2802f57eb9D98E2B6a68217d75a0658c',
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
