import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'gtbtc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0xc2d09CF86b9ff43Cb29EF8ddCa57A4Eb4410D5f3',
  },
  {
    chain: 'bsc',
    address: '0xc2d09CF86b9ff43Cb29EF8ddCa57A4Eb4410D5f3',
  },
  {
    chain: 'base',
    address: '0xc2d09CF86b9ff43Cb29EF8ddCa57A4Eb4410D5f3',
  },
  {
    chain: 'solana',
    address: 'gtBTCGWvSRYYoZpU9UZj6i3eUGUpgksXzzsbHk2K9So',
    decimals: 8,
  },
]

export default {
  whitelisted: true,
  ... getBitcoinReservesAdapter(protocolId, mintedTokens),
};
