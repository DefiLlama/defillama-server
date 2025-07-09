import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'coinbase-btc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  },
  {
    chain: 'base',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  },
  {
    chain: 'arbitrum',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  },
  {
    chain: 'solana',
    address: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
    decimals: 8,
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
