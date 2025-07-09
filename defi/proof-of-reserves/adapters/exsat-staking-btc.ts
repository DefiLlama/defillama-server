import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'exsat-staking-btc';

const mintedTokens = [
  {
    chain: 'xsat',
    address: '0xaFB068838136358CFa6B54BEa580B86DF70BBA7f',
  },
  {
    chain: 'plume_mainnet',
    address: '0xaFB068838136358CFa6B54BEa580B86DF70BBA7f',
  },
  {
    chain: 'hemi',
    address: '0xaFB068838136358CFa6B54BEa580B86DF70BBA7f',
  },
  {
    chain: 'goat',
    address: '0xaFB068838136358CFa6B54BEa580B86DF70BBA7f',
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
