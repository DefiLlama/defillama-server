import { getBitcoinBridgeLockAndMintAdapter } from '../utils/bridge';

const protocolId = 'free-protocol-bbtc';

const mintedTokens = [
  // BounceBit BBTC Bridge
  {
    chain: 'zklink',
    address: '0x7118D8700B1b635CA37992294349Dc616fDC94Fe',
  },
  {
    chain: 'linea',
    address: '0x93C12084dCFC08c759ad96B94234D9C39705689f',
  },
]

const reservesTokens = [
  // BounceBit BBTC Bridge
  {
    chain: 'bouncebit',
    address: '0xF5e11df1ebCf78b6b6D26E04FF19cD786a1e81dC',
    owners: ['0x962B242e02BbcFe5475aB2272B1C77E5f1E9683F'],
  },
]

export default getBitcoinBridgeLockAndMintAdapter(protocolId, mintedTokens, reservesTokens);
