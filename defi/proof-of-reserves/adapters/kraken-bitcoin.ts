import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'kraken-bitcoin';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98',
  },
  {
    chain: 'optimism',
    address: '0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98',
  },
  {
    chain: 'ink',
    address: '0x73E0C0d45E048D25Fc26Fa3159b0aA04BfA4Db98',
  },
  {
    chain: 'unichain',
    address: '0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98',
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
