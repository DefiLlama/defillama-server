import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'allobtc';

const mintedTokens = [
  {
    chain: 'bsc',
    address: '0x91a87e2f274b18ffBe98371CAc12eFd50387Ca36',
  },
]

export default {
  whitelisted: true,
  ... getBitcoinReservesAdapter(protocolId, mintedTokens),
};
