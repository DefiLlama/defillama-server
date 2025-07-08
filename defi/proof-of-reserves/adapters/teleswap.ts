import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'teleswap';

const mintedTokens = [
  {
    chain: 'bsc',
    address: '0xC58C1117DA964aEbe91fEF88f6f5703e79bdA574',
  },
  {
    chain: 'polygon',
    address: '0x3BF668Fe1ec79a84cA8481CEAD5dbb30d61cC685',
  },
  {
    chain: 'bsquared',
    address: '0x05698eaD40cD0941e6E5B04cDbd56CB470Db762A',
  },
  {
    chain: 'bob',
    address: '0x0670bEeDC28E9bF0748cB254ABd946c87f033D9d',
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
