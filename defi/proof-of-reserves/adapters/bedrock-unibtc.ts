import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'bedrock-unibtc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x004E9C3EF86bc1ca1f0bB5C7662861Ee93350568',
  },
  {
    chain: 'bsc',
    address: '0x6B2a01A5f79dEb4c2f3c0eDa7b01DF456FbD726a',
  },
  {
    chain: 'zeta',
    address: '0x6B2a01A5f79dEb4c2f3c0eDa7b01DF456FbD726a',
  },
  {
    chain: 'iotex',
    address: '0x93919784c523f39cacaa98ee0a9d96c3f32b593e',
  },
  {
    chain: 'taiko',
    address: '0x93919784C523f39CACaa98Ee0a9d96c3F32b593e',
  },
  {
    chain: 'arbitrum',
    address: '0x6B2a01A5f79dEb4c2f3c0eDa7b01DF456FbD726a',
  },
  {
    chain: 'optimism',
    address: '0x93919784C523f39CACaa98Ee0a9d96c3F32b593e',
  },
  {
    chain: 'bob',
    address: '0x236f8c0a61dA474dB21B693fB2ea7AAB0c803894',
  },
  {
    chain: 'mantle',
    address: '0x93919784C523f39CACaa98Ee0a9d96c3F32b593e',
  },
  {
    chain: 'mode',
    address: '0x6B2a01A5f79dEb4c2f3c0eDa7b01DF456FbD726a',
  },
  {
    chain: 'merlin',
    address: '0x93919784C523f39CACaa98Ee0a9d96c3F32b593e',
  },
  {
    chain: 'btr',
    address: '0x93919784C523f39CACaa98Ee0a9d96c3F32b593e',
  },
  // {
  //   chain: 'bsquared',
  //   address: '0x93919784C523f39CACaa98Ee0a9d96c3F32b593e',
  // },
  {
    chain: 'corn',
    address: '0x93919784C523f39CACaa98Ee0a9d96c3F32b593e',
  },
  {
    chain: 'berachain',
    address: '0xC3827A4BC8224ee2D116637023b124CED6db6e90',
  },
  {
    chain: 'sonic',
    address: '0xC3827A4BC8224ee2D116637023b124CED6db6e90',
  },
  {
    chain: 'hemi',
    address: '0xF9775085d726E782E83585033B58606f7731AB18',
  },
  {
    chain: 'duckchain',
    address: '0x93919784C523f39CACaa98Ee0a9d96c3F32b593e',
  },
  {
    chain: 'rsk',
    address: '0xd3C8Da379d71A33BFEe8875F87AC2748beb1D58d',
  },
  {
    chain: 'sei',
    address: '0xDfc7D2d003A053b2E0490531e9317A59962b511E',
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
