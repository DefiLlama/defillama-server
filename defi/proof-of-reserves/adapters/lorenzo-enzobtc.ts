import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'lorenzo-enzobtc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a',
  },
  {
    chain: 'ethereum',
    address: '0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3',
  },
  {
    chain: 'bsc',
    address: '0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a',
  },
  {
    chain: 'bsc',
    address: '0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3',
  },
  {
    chain: 'bsquared',
    address: '0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3',
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
