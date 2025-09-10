import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'lorenzo-enzobtc';

const mintedTokens = [
  { chain: 'ethereum', address: '0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a' },
  { chain: 'bsc', address: '0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a' },
  { chain: 'goat', address: '0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a' },
  { chain: 'sei', address: '0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a' },
  { chain: 'morph', address: '0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a' },
  { chain: 'hemi', address: '0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a' },
  { chain: 'plume_mainnet', address: '0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a' },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
