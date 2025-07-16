import { getBitcoinBridgeLockAndMintAdapter } from '../utils/bridge';

const protocolId = 'free-protocol-ubtc';

const mintedTokens = [
  // uBTC Bridge
  {
    chain: 'bsc',
    address: '0x2a3DC2D5daF9c8c46C954b8669F4643C6b1C081a',
  },
  {
    chain: 'mode',
    address: '0x3Ba89d490AB1C0c9CC2313385b30710e838370a4',
  },
  {
    chain: 'core',
    address: '0xbB4A26A053B217bb28766a4eD4b062c3B4De58ce',
  },
  {
    chain: 'op_bnb',
    address: '0xf7fB2DF9280eB0a76427Dc3b34761DB8b1441a49',
  },
  {
    chain: 'hemi',
    address: '0x78E26E8b953C7c78A58d69d8B9A91745C2BbB258',
  },
  {
    chain: 'sei',
    address: '0x78E26E8b953C7c78A58d69d8B9A91745C2BbB258',
  },
  {
    chain: 'goat',
    address: '0x78E26E8b953C7c78A58d69d8B9A91745C2BbB258',
  },
]

const reservesTokens = [
  // uBTC Bridge
  {
    chain: 'bsquared',
    address: '0x796e4D53067FF374B89b2Ac101ce0c1f72ccaAc2',
    owners: ['0xD5f051fF82D90D086B57842e6Aae8f2FAa80Cb1c'],
  },
]

export default getBitcoinBridgeLockAndMintAdapter(protocolId, mintedTokens, reservesTokens);
