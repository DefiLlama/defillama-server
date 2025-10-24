import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'bitlayer-bridge';

const mintedTokens = [
  {
    chain: 'btr',
    address: '0xff204e2681a6fa0e2c3fade68a1b28fb90e4fc5f',
  }
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
