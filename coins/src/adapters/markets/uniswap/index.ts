import getExtras from "./extraLp";
import { getUniV2Adapter } from "../../utils/uniV2";

const sushiFactory = "0xc35DADB65012eC5796536bD9864eD8773aBc74C4";
const alternateGetReservesAbi =
  "function getReserves() view returns (uint112 _reserve0, uint112 _reserve1)";

const config = {
  uniswap: { endpoint: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v2-dev', chain: 'ethereum' },
  sushiswap: [
    { endpoint: 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange', chain: 'ethereum', factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac', },
    { endpoint: 'https://api.thegraph.com/subgraphs/name/sushiswap/arbitrum-exchange', chain: 'arbitrum', factory: sushiFactory, },
    { endpoint: 'https://api.thegraph.com/subgraphs/name/sushiswap/matic-exchange', chain: 'polygon', factory: sushiFactory, },
    { endpoint: 'https://api.thegraph.com/subgraphs/name/sushiswap/avalanche-exchange', chain: 'avax', factory: sushiFactory, },
    { endpoint: 'https://api.thegraph.com/subgraphs/name/sushiswap/xdai-exchange', chain: 'xdai', factory: sushiFactory, },
    { chain: 'moonriver', factory: sushiFactory, },
    { endpoint: 'https://api.thegraph.com/subgraphs/name/sushiswap/bsc-exchange', chain: 'bsc', factory: sushiFactory, },
  ],
  zkSwap: { factory: '0x3a76e377ED58c8731F9DF3A36155942438744Ce3', chain: 'era', uniqueLPNames: true, },
  'eddy-fi': { factory: '0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c', chain: 'zeta', getReservesAbi: alternateGetReservesAbi, },
  // pancakeswap: { endpoint: 'https://info-gateway.pancakeswap.com/subgraphs/v2/bsc/graphql', chain: 'bsc', factory: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73', },
  traderJoe: { chain: 'avax', factory: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10', endpoint: 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange' },
  vvsFinance: { chain: 'cronos', factory: '0x3b44b2a187a7b3824131f8db5a74194d0a42fc15', },
  quickswap: { chain: 'polygon', factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32', endpoint: 'https://api.thegraph.com/subgraphs/name/sameepsi/quickswap06' },
  biswap: { chain: 'bsc', factory: '0x858e3312ed3a876947ea49d572a7c42de08af7ee', },
  // mmFinance: { chain: 'cronos', factory: '0xd590cC180601AEcD6eeADD9B7f2B7611519544f4', },
  trisolaris: { chain: 'aurora', factory: '0xc66F594268041dB60507F00703b152492fb176E7', },
  pangolin: { chain: 'avax', factory: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88', },
  spiritswap: { chain: 'fantom', factory: '0xEF45d134b73241eDa7703fa787148D9C9F4950b0', },
  spookyswap: { chain: 'fantom', factory: '0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3', endpoint: "https://api.thegraph.com/subgraphs/name/eerieeight/spookyswap" },
  tombswap: { chain: 'fantom', factory: '0xE236f6890F1824fa0a7ffc39b1597A5A6077Cfe9', },
  wemix: { chain: 'wemix', factory: '0xe1F36C7B919c9f893E2Cd30b471434Aa2494664A', },
  // solidly: { chain: 'fantom', factory: '0x3fAaB499b519fdC5819e3D7ed0C26111904cbc28', },
  diffusion: { chain: 'evmos', factory: '0x6abdda34fb225be4610a2d153845e09429523cd2', },
  equalizer: { chain: 'fantom', factory: '0xc6366efd0af1d09171fe0ebf32c7943bb310832a', hasStablePools: true, },
  camelot: { chain: 'arbitrum', factory: '0x6eccab422d763ac031210895c81787e87b43a652', },
  velocore: { chain: 'era', factory: '0xe140eac2bb748c8f456719a457f26636617bb0e9', hasStablePools: true, },
  mute: { chain: 'era', factory: '0x40be1cba6c5b47cdf9da7f963b6f761f4c60627d', hasStablePools: true, stablePoolSymbol: 'vMLP', },
  spacefi: { chain: 'era', factory: '0x0700fb51560cfc8f896b2c812499d17c5b0bf6a7', },
  // gemswap: { chain: 'era', factory: '0x065c8703132F2A38Be3d2dbF7Be6BE455930560c', },
  glacier: { chain: 'avax', factory: '0xac7b7eac8310170109301034b8fdb75eca4cc491', hasStablePools: true, },
  thena: { chain: 'bsc', factory: '0xAFD89d21BdB66d00817d4153E055830B1c2B3970', hasStablePools: true, },
  fvm: { chain: 'fantom', factory: '0x472f3C3c9608fe0aE8d702f3f8A2d12c410C881A', hasStablePools: true, },
  velocimeter: { chain: 'base', factory: '0xe21Aac7F113Bd5DC2389e4d8a8db854a87fD6951', hasStablePools: true, },
  pulsex: { chain: 'pulse', factory: '0x1715a3E4A142d8b698131108995174F37aEBA10D', endpoint: "https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsex", },
  elysium: { chain: 'elsm', factory: '0x5bec5d65fAba8E90e4a74f3da787362c60F22DaE', },
  // zkswap: { chain: 'polygon_zkevm', factory: '0x51A0D4B81400581d8722627daFCd0c1Ff9357d1D', getReservesAbi: alternateGetReservesAbi, },
  aerodrome: { chain: 'base', factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da', hasStablePools: true, },
  jibswap: { chain: 'jbc', factory: '0x4BBdA880C5A0cDcEc6510f0450c6C8bC5773D499', },
  macaron: { chain: "btr", factory: "0x1037e9078df7ab09b9af78b15d5e7aad7c1afdd0", },
}

export function extraUniV2Lps(timestamp: number = 0) {
  return Promise.all([
    getExtras(
      timestamp,
      "0x82DB765c214C1AAB16672058A3C22b12F6A42CD0",
      "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      "avax",
    ),
    getExtras(
      timestamp,
      "0x5f973e06a59d0bafe464faf36d5b3b06e075c543",
      "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      "avax",
    ),
    getExtras(
      timestamp,
      "0xd1f377b881010cb97ab0890a5ef908c45bcf13f9",
      "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      "avax",
    ),
    getExtras(
      timestamp,
      "0x517F9dD285e75b599234F7221227339478d0FcC8",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "ethereum",
    ),
    getExtras(
      timestamp,
      "0x3A0eF60e803aae8e94f741E7F61c7CBe9501e569",
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "ethereum",
    ),
  ]);
}

export const adapters: {
  [key: string]: Function;
} = {
  extraUniV2Lps,
};

Object.entries(config).forEach(([project, value]: any) => {
  if (Array.isArray(value)) {
    value.forEach((v) => {
      if (!v.project) v.project = project;
      adapters[`${project}-${v.chain}`] = getUniV2Adapter(v);
    });
    return;
  }

  if (!value.project) value.project = project;

  adapters[project] = getUniV2Adapter(value);
});
