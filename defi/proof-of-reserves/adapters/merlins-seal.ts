import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'merlins-seal';

const mintedTokens = [
  {
    chain: 'merlin',
    address: '0xb880fd278198bd590252621d4cd071b1842e9bcd',
  },
  // {
  //   chain: 'ethereum',
  //   address: '0x2f913c820ed3beb3a67391a6eff64e70c4b20b19',
  // },
  // {
  //   chain: 'era',
  //   address: '0xe757355edba7ced7b8c0271bba4efda184ad75ab',
  // },
  // {
  //   chain: 'sei',
  //   address: '0x9bfa177621119e64cecbeabe184ab9993e2ef727',
  // },
  // {
  //   chain: 'klaytn',
  //   address: '0x0f921c39efd98809fe6d20a88a4357454578987a',
  // },
  // {
  //   chain: 'taiko',
  //   address: '0xf7fb2df9280eb0a76427dc3b34761db8b1441a49',
  // },
  // {
  //   chain: 'lisk',
  //   address: '0x9bfa177621119e64cecbeabe184ab9993e2ef727',
  // },
  // {
  //   chain: 'linea',
  //   address: '0xe4d584ae9b753e549cae66200a6475d2f00705f7',
  // },
  // {
  //   chain: 'mode',
  //   address: '0x59889b7021243db5b1e065385f918316cd90d46c',
  // },
  // {
  //   chain: 'bsc',
  //   address: '0x9bfa177621119e64cecbeabe184ab9993e2ef727',
  // },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
