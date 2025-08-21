import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'lombard';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x8236a87084f8B84306f72007F36F2618A5634494',
  },
  {
    chain: 'base',
    address: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  },
  {
    chain: 'bsc',
    address: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  },
  {
    chain: 'etlk',
    address: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  },
  {
    chain: 'katana',
    address: '0xb0f70c0bd6fd87dbeb7c10dc692a2a6106817072', // BTCK
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
