const BOOL_KEYS = [
  'LLAMA_DEBUG_MODE',
]

const DEFAULTS: any = {
  ANKR_API_KEY: '79258ce7f7ee046decc3b5292a24eb4bf7c910d7e39b691384c7ce0cfb839a01',
  ZETA_RPC: "https://zetachain-evm.blockpi.network/v1/rpc/public,https://zetachain-mainnet-archive.allthatnode.com:8545",
  SOMNIA_RPC: "https://api.infra.mainnet.somnia.network",
  SOMNIA_ARCHIVAL_RPC: 'https://explorer.somnia.network/api/eth-rpc',
  CAMP_RPC: 'https://rpc.camp.raas.gelato.cloud',
  SVM_RPC: "https://rpc.cosvm.net",
  XLAYER_RPC: "https://xlayerrpc.okx.com",
  BITLAYER_RPC: "https://rpc.bitlayer.org,https://rpc.ankr.com/bitlayer,https://rpc.bitlayer-rpc.com,https://rpc-bitlayer.rockx.com",
  PLANQ_RPC: "https://planq-rpc.nodies.app,https://jsonrpc.planq.nodestake.top",
  BERACHAIN_RPC: "https://rpc.berachain.com",
  VELAS_RPC: 'https://evmexplorer.velas.com/api/eth-rpc',
  HARMONY_RPC: 'https://explorer.harmony.one/api/eth-rpc',
  SMARTBCH_RPC: 'https://smartscout.cash//api/eth-rpc',
  HYPERLIQUID_RPC: 'https://rpc.purroofgroup.com',
  FUSE_RPC: 'https://explorer.fuse.io/api/eth-rpc',
  SWELLCHAIN_ARCHIVAL_RPC: 'https://explorer.swellnetwork.io/api/eth-rpc',
  XRPL_EVM_RPC: 'https://explorer.xrplevm.org/api/eth-rpc',
  MANTLE_ARCHIVAL_RPC: 'https://explorer.mantle.xyz/api/eth-rpc',
  CANTO_RPC: 'https://tuber.build/api/eth-rpc',
  APTOS_RPC: 'https://aptos-mainnet.pontem.network',
  HYDRAGON_RPC: "https://rpc-mainnet.hydrachain.org",
  TAC_RPC: "https://rpc.tac.build",
  FRAXTAL_RPC: "https://rpc.frax.com",
  NIBIRU_RPC: "https://evm-rpc.archive.nibiru.fi",
  TAC_RPC_MULTICALL: "0xcA11bde05977b3631167028862bE2a173976CA11",
  SOLANA_RPC: "https://api.mainnet-beta.solana.com",
  VIRTUS_BACKEND_BASE: 'https://back.virtus-protocol.com/api',
}

export const ENV_KEYS = new Set([
  ...BOOL_KEYS,
  ...Object.keys(DEFAULTS),
  'PANCAKESWAP_OPBNB_SUBGRAPH',
  'INDEXA_DB',
  'FLIPSIDE_API_KEY',
  'DUNE_API_KEYS',
  'DUNE_RESTRICTED_MODE',
  'ALLIUM_API_KEY',
  'BIT_QUERY_API_KEY',
  'SMARDEX_SUBGRAPH_API_KEY',
  'PROD_VYBE_API_KEY',
  'PERENNIAL_V2_SUBGRAPH_API_KEY',
  'LEVANA_API_KEY',
  'ZEROx_API_KEY',
  'ZEROX_API_KEY',
  'AGGREGATOR_0X_API_KEY',
  'SUI_RPC',
  'OKX_API_KEY',
  'ALCHEMIX_KEY',
  'ALCHEMIX_SECRET',
  'FLIPSIDE_RESTRICTED_MODE',
  'STARBASE_API_KEY',
  'ENSO_API_KEY',
  'NUMIA_API_KEY',
  'CAMELOT_API_KEY',
  'TRADERJOE_API_KEY',
  'MULTIVERSX_USERS_API_KEY',
  'BLOCKSCOUT_BULK_MODE',
  'CG_KEY',
  'METAPLEX_API_KEY',
  'DEFIAPP_API_KEY',
  'SMARDEX_SUBGRAPH_API_KEY',
  'VIRTUS_BACKEND_BASE',
  'DUNE_BULK_MODE',
  'DUNE_BULK_MODE_BATCH_TIME',
  'LLAMA_HL_INDEXER',
])

// This is done to support both ZEROx_API_KEY and ZEROX_API_KEY
if (!process.env.ZEROX_API_KEY) process.env.ZEROX_API_KEY = process.env.ZEROx_API_KEY

Object.keys(DEFAULTS).forEach(i => {
  if (!process.env[i]) process.env[i] = DEFAULTS[i] // this is done to set the chain RPC details in @defillama/sdk
})


export function getEnv(key: string): any {
  if (!ENV_KEYS.has(key)) throw new Error(`Unknown env key: ${key}`)
  const value = process.env[key] ?? DEFAULTS[key]
  return BOOL_KEYS.includes(key) ? !!value : value
}
