import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'obeliskbtc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0xB1e12802831Da99D2d47b6a55049D69bf7De0e3C',
  },
  // {
  //   chain: 'bsquared',
  //   address: '0x1349A8d352b1971CbEbeacF55Fb75526F47B6610',
  // },
  {
    chain: 'mode',
    address: '0xe3C0FF176eF92FC225096C6d1788cCB818808b35',
  },
  {
    chain: 'taiko',
    address: '0xe3C0FF176eF92FC225096C6d1788cCB818808b35',
  },
  {
    chain: 'core',
    address: '0x000734cf9e469bad78c8ec1b0deed83d0a03c1f8',
  },
  {
    chain: 'xsat',
    address: '0xe3C0FF176eF92FC225096C6d1788cCB818808b35',
  },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
