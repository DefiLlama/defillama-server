import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'bedrock-brbtc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x2eC37d45FCAE65D9787ECf71dc85a444968f6646',
  },
  {
    chain: 'bsc',
    address: '0x733a6c29eda4a58931ae81b8d91e29f2eaf01df3',
  },
  {
    chain: 'berachain',
    address: '0x93919784C523f39CACaa98Ee0a9d96c3F32b593e',
  },
]

export default {
  disabled: true,
  ...getBitcoinReservesAdapter(protocolId, mintedTokens),
};
