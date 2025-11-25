import { getBitcoinBridgeLockAndMintAdapter } from '../utils/bridge';

const protocolId = 'free-protocol-solvbtc-b';

const mintedTokens = [
  // SolvBTC.b Bridge
  {
    chain: 'zklink',
    address: '0x586E593Ffa60c15Ed722342f3C08cc90410e4fEA',
  },
  {
    chain: 'linea',
    address: '0x96155858A02c410c3C814BB32Fdc413b3241b62E',
  },
  {
    chain: 'core',
    address: '0x5B1Fb849f1F76217246B8AAAC053b5C7b15b7dc3',
  },
  {
    chain: 'scroll',
    address: '0x3Ba89d490AB1C0c9CC2313385b30710e838370a4',
  },
]

const reservesTokens = [
  // SolvBTC.b Bridge
  {
    chain: 'bsc',
    address: '0x4aae823a6a0b376De6A78e74eCC5b079d38cBCf7',
    owners: ['0xF8aeD4da2598d3dF878488F40D982d6EcC8B13Ad'],
  },
] 

export default getBitcoinBridgeLockAndMintAdapter(protocolId, mintedTokens, reservesTokens);
