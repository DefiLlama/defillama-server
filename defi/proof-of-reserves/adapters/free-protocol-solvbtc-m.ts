import { getBitcoinBridgeLockAndMintAdapter } from '../utils/bridge';

const protocolId = 'free-protocol-solvbtc-m';

const mintedTokens = [
  // SolvBTC.m Bridge
  {
    chain: 'zklink',
    address: '0xbEAf16cFD8eFe0FC97C2a07E349B9411F5dC272C',
  },
  {
    chain: 'linea',
    address: '0x5FFcE65A40f6d3de5332766ffF6A28BF491C868c',
  },
  {
    chain: 'core',
    address: '0xe04d21d999FaEDf1e72AdE6629e20A11a1ed14FA',
  },
  {
    chain: 'btr',
    address: '0xe04d21d999FaEDf1e72AdE6629e20A11a1ed14FA',
  },
  // {
  //   chain: 'bsquared',
  //   address: '0x2931a7dAb3dF4135823Ca9f36680fbbC741a2b3B',
  // },
  {
    chain: 'scroll',
    address: '0x2365649F604377bA6472579e8c19fACFED13C9DC',
  },
]

const reservesTokens = [
  // SolvBTC.m Bridge
  {
    chain: 'merlin',
    address: '0x41D9036454BE47d3745A823C4aaCD0e29cFB0f71',
    owners: ['0xD5f051fF82D90D086B57842e6Aae8f2FAa80Cb1c', '0xE12382e046DB998DE89aF19Ca799CbB757106781'],
  },
]

export default getBitcoinBridgeLockAndMintAdapter(protocolId, mintedTokens, reservesTokens);
