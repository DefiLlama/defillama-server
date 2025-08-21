import { getBitcoinBridgeLockAndMintAdapter } from '../utils/bridge';

const protocolId = 'free-protocol-mbtc';

const mintedTokens = [
  // M-BTC Bridge
  {
    chain: 'ethereum',
    address: '0x2F913C820ed3bEb3a67391a6eFF64E70c4B20b19',
  },
  {
    chain: 'bsc',
    address: '0x9BFA177621119e64CecbEabE184ab9993E2ef727',
  },
  {
    chain: 'zklink',
    address: '0x85D431A3a56FDf2d2970635fF627f386b4ae49CC',
  },
  {
    chain: 'linea',
    address: '0xe4D584ae9b753e549cAE66200A6475d2f00705f7',
  },
  {
    chain: 'scroll',
    address: '0x95D7F7a7D3f01A4378e28fB777A04D8AF1D9E204',
  },
  {
    chain: 'manta',
    address: '0x9BFA177621119e64CecbEabE184ab9993E2ef727',
  },
  {
    chain: 'mode',
    address: '0x59889b7021243dB5B1e065385F918316cD90D46c',
  },
  {
    chain: 'era',
    address: '0xE757355edba7ced7B8c0271BBA4eFDa184aD75Ab',
  },
  // {
  //   chain: 'bsquared',
  //   address: '0x236CdB93E16884266e902fEE1f5Db37a19B72878',
  // },
  {
    chain: 'btr',
    address: '0x50660CAC0e59E35c6A120E704A872dF80D421a9d',
  },
  {
    chain: 'taiko',
    address: '0xf7fB2DF9280eB0a76427Dc3b34761DB8b1441a49',
  },
  {
    chain: 'kava',
    address: '0x59889b7021243dB5B1e065385F918316cD90D46c',
  },
  {
    chain: 'klaytn',
    address: '0x0F921c39eFd98809FE6D20a88A4357454578987a',
  },
  {
    chain: 'sei',
    address: '0x9BFA177621119e64CecbEabE184ab9993E2ef727',
  },
  {
    chain: 'duckchain',
    address: '0x9BFA177621119e64CecbEabE184ab9993E2ef727',
  },
  {
    chain: 'iotex',
    address: '0x0F921c39eFd98809FE6D20a88A4357454578987a',
  },
  {
    chain: 'lisk',
    address: '0x9BFA177621119e64CecbEabE184ab9993E2ef727',
  },
]

const reservesTokens = [
  // M-BTC Bridge
  {
    chain: 'merlin',
    address: '0xB880fd278198bd590252621d4CD071b1842E9Bcd',
    owners: ['0xA6E02b4445dB933FCD125a449448326d6505B189', '0x79af88101aB5589aB0f92a2bbAbe2bAe1c602806'],
  },
]

export default getBitcoinBridgeLockAndMintAdapter(protocolId, mintedTokens, reservesTokens);
