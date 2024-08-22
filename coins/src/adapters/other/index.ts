import synthetixAdapter from "./synthetix";
import glp from "./glp";
import abraAdapter from "./abracadabra";
import unknownTokenAdapter from "./unknownToken";
import podsAdapter from "./pods";
import distressedAdapter from "./distressedAssets";
import { contracts } from "./distressed";
import manualInputAdapter from "./manualInput";
import realtAdapter from "./realt";
import metronomeAdapter from "./metronome";
import { contracts as metronomeContracts } from "./metronome";
import { wrappedGasTokens } from "../utils/gasTokens";
import collateralizedAdapter from "./collateralizedAssets";
import swethAdapter from "./sweth";
import gmdAdapter from "./gmd";
import stkaurabalAdapter from "./stkaurabal";
import shlb_ from "./shlb";
import axios from "axios";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import mooBvmAdapter from "./mooBvmEth";
import defiChainAdapter from "./defichain";
import velgAdapter from "./velgd";
import steadefiEth from "./steadefi_eth";
import steadefiWbtc from "./steadefi_wbtc";
import steadefiUsdArb from "./steadefi_usdc_arb";
import steadefiUsdEth from "./steadefi_usdc_eth";
import steadefiUsdLink from "./steadefi_usdc_link";
import steadefiUsdWbtc from "./steadefi_usdc_wbtc";
import warlordAdapter from "./warlord";
import opdxAdapter from "./odpxWethLP";
import teahouseAdapter from "./teahouse";
import opal from "./opal";
import gmdV2 from "./gmdV2";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

export { glp };

export const shlb = shlb_;

export function steadefi(timestamp: number = 0) {
  return Promise.all([
    steadefiEth(timestamp),
    steadefiWbtc(timestamp),
    steadefiUsdArb(timestamp),
    steadefiUsdEth(timestamp),
    steadefiUsdLink(timestamp),
    steadefiUsdWbtc(timestamp),
  ]);
}
export function teahouse(timestamp: number = 0) {
  return teahouseAdapter(timestamp);
}
export function opdx(timestamp: number = 0) {
  return opdxAdapter(timestamp);
}
export function defiChain(timestamp: number = 0) {
  return defiChainAdapter(timestamp);
}
export function synthetix(timestamp: number = 0) {
  return synthetixAdapter(timestamp);
}

export function metronome(timestamp: number = 0) {
  return Promise.all(
    Object.keys(metronomeContracts).map((chain) =>
      metronomeAdapter(chain, timestamp),
    ),
  );
}

export function abracadabra(timestamp: number = 0) {
  return abraAdapter(timestamp);
}
export function unknownTokens(timestamp: number = 0) {
  return Promise.all([
    unknownTokenAdapter(
      timestamp,
      "0xe510c67dd0a54d06f04fd5af9094fe64ed605eab",
      "0xd51bfa777609213a653a2cd067c9a0132a2d316a",
      "0x76bf5e7d2bcb06b1444c0a2742780051d8d0e304",
      false,
      "beam",
      1.01,
    ),
  ]);
}
export function unknownTokens2(timestamp: number = 0) {
  return Promise.all([
    unknownTokenAdapter(
      timestamp,
      "0x501ca56E4b6Af84CBAAaaf2731D7C87Bed32ee65",
      "0x7b0400231Cddf8a7ACa78D8c0483890cd0c6fFD6",
      "0x5c46bFF4B38dc1EAE09C5BAc65872a1D8bc87378",
      false,
      "merlin",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x2A36b45be4C04900A5946A1B6bf991aDec93ADdE",
      "0xE31DD093A2A0aDc80053bF2b929E56aBFE1B1632",
      "0x79Cb92a2806BF4f82B614A84b6805963b8b1D8BB",
      false,
      "q",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x908b3CB9F8E6441B2b1844A6D4f1AC4707bd1483",
      "0x6906Ccda405926FC3f04240187dd4fAd5DF6d555",
      "0x1c1b06405058AbE02e4748753aeD1458BEFEE3B9",
      false,
      "bfc",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x09cabec1ead1c0ba254b09efb3ee13841712be14",
      "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359",
      wrappedGasTokens["ethereum"],
      true,
      "ethereum",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xcD15C231b8A0Bae40bD7938AE5eA8e43f1e9a15F",
      "0x0D94e59332732D18CF3a3D457A8886A2AE29eA1B",
      "0xC348F894d0E939FE72c467156E6d7DcbD6f16e21",
      false,
      "songbird",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xa0feB3c81A36E885B6608DF7f0ff69dB97491b58",
      "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      "0x20f663CEa80FaCE82ACDFA3aAE6862d246cE0333",
      false,
      "bsc",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x604bd24343134066c16ffc3efce5d3ca160c1fee",
      "0x5b52bfb8062ce664d74bbcd4cd6dc7df53fd7233", //ZENIQ
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      false,
      "bsc",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x59b51516032241b796de4e495A90030C2d48BD1e",
      "0x9B377bd7Db130E8bD2f3641E0E161cB613DA93De", //stWEMIX
      "0x7D72b22a74A216Af4a002a1095C8C707d6eC1C5f",
      false,
      "wemix",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xC597952437Fa67B4a28bb03B19BF786AD26A4036",
      "0x1702EC380e924B0E12d5C2e838B6b91A1fB3A052", //bSERO
      "0x55d398326f99059fF775485246999027B3197955",
      false,
      "bsc",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xeAdff72aBdA0709CD795CEFa3A44f45a22440144",
      "0x1f88e9956c8f8f64c8d5fef5ed8a818e2237112c", //UCON
      "0x55d398326f99059fF775485246999027B3197955",
      false,
      "bsc",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x4b4237b385bd6eaf3ef6b20dbcaed4158a688af7",
      "0xD86c0B9b686f78a7A5C3780f03e700dbbAd40e01",
      "0xdac17f958d2ee523a2206206994597c13d831ec7",
      false,
      "ethereum",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xC977492506E6516102a5687154394Ed747A617ff",
      "0xEC13336bbd50790a00CDc0fEddF11287eaF92529", // gmUSD
      "0x4945970EfeEc98D393b4b979b9bE265A3aE28A8B",
      false,
      "arbitrum",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x2071a39da7450d68e4f4902774203df208860da2",
      "0x3712871408a829c5cd4e86da1f4ce727efcd28f6", // GLCR
      "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
      false,
      "avax",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x8a3EcB040d270ca92E122104e2d622b71c89E3cE",
      "0x09EF821c35B4577f856cA416377Bd2ddDBD3d0C9", // MMTH
      "0x152b9d0FdC40C096757F570A51E494bd4b943E50",
      false,
      "avax",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xd3aC0C63feF0506699d68d833a10477137254aFf",
      "0x9A592B4539E22EeB8B2A3Df679d572C7712Ef999", //pxGMX
      "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      false,
      "arbitrum",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x0E8f117a563Be78Eb5A391A066d0d43Dd187a9E0",
      "0x07bb65faac502d4996532f834a1b7ba5dc32ff96", //FVM
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xf3C45b45223Df6071a478851B9C17e0630fDf535",
      "0x1e925De1c68ef83bD98eE3E130eF14a50309C01B",
      "0x4200000000000000000000000000000000000006",
      false,
      "optimism",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x53713F956A4DA3F08B55A390B20657eDF9E0897B",
      "0xd386a121991E51Eab5e3433Bf5B1cF4C8884b47a",
      "0x4200000000000000000000000000000000000006",
      false,
      "base",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x9f8a222fd0b75239b32aa8a97c30669e5981db05",
      "0x999999999939ba65abb254339eec0b2a0dac80e9",
      "0xff3e7cf0c007f919807b32b30a4a9e7bd7bc4121",
      false,
      "klaytn",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x280608DD7712a5675041b95d0000B9089903B569",
      "0x24599b658b57f91E7643f4F154B16bcd2884f9ac",
      "0xC4B7C87510675167643e3DE6EEeD4D2c06A9e747",
      true,
      "jbc",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xb5E331615FdbA7DF49e05CdEACEb14Acdd5091c3",
      "0xCc7FF230365bD730eE4B352cC2492CEdAC49383e",
      "0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4",
      false,
      "base",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x44C85D45EB17C8A6b241807BE5c9c48201F91837",
      "0x5c725631FD299703D0A74C23F89a55c6B9A0C52F",
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x6bB685358BC3991D9279562710F3a44B7e5F2D9b",
      "0x3dc57B391262e3aAe37a08D91241f9bA9d58b570",
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xaCf56C6aadDc1408A11AbAb3140b90b57Fc6Aaf7",
      "0x248CB87DDA803028dfeaD98101C9465A2fbdA0d4",
      "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xaCf56C6aadDc1408A11AbAb3140b90b57Fc6Aaf7",
      "0x248CB87DDA803028dfeaD98101C9465A2fbdA0d4",
      "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x4733bc45eF91cF7CcEcaeeDb794727075fB209F2", // pool
      "0x4cdF39285D7Ca8eB3f090fDA0C069ba5F4145B37", // unknown
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x89d9bC2F2d091CfBFc31e333D6Dc555dDBc2fd29",
      "0xb3654dc3D10Ea7645f8319668E8F54d2574FBdC8",
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x89d9bC2F2d091CfBFc31e333D6Dc555dDBc2fd29",
      "0xb3654dc3D10Ea7645f8319668E8F54d2574FBdC8",
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xde62A6CdD8d5A3988495317CfFac9F3fED299383",
      "0xC17c30e98541188614dF99239cABD40280810cA3",
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xa7010b3ba9efb1AF9Fa8a30efe74C16A93891775",
      "0x6626c47c00F1D87902fc13EECfaC3ed06D5E8D8a",
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x011732f65e2f28C50F528e32420A2F69937b9e68",
      "0x89346B51A54263cF2e92dA79B1863759eFa68692",
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x43E1059c05D3153B5D74303DD6474a43BC87E73e",
      "0xd7028092c830b5C8FcE061Af2E593413EbbC1fc1",
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xCC656162f9f157860bB7309B72374eCE447e327a",
      "0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e",
      "0xd7028092c830b5C8FcE061Af2E593413EbbC1fc1",
      false,
      "fantom",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xEc7178F4C41f346b2721907F5cF7628E388A7a58",
      "0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE",
      "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      false,
      "fantom",
    ),
  ]);
}
export function pods(timestamp: number = 0) {
  return podsAdapter(timestamp);
}
export function distressed(timestamp: number = 0) {
  return Promise.all(
    Object.keys(contracts).map((chain: string) =>
      distressedAdapter(chain, timestamp),
    ),
  );
}
export function manualInput(timestamp: number = 0) {
  return Promise.all([
    manualInputAdapter("evmos", timestamp),
    manualInputAdapter("arbitrum", timestamp),
    manualInputAdapter("polygon", timestamp),
    manualInputAdapter("kava", timestamp),
    manualInputAdapter("polygon_zkevm", timestamp),
    manualInputAdapter("ethereum", timestamp),
  ]);
}
export function realt(timestamp: number = 0) {
  return Promise.all([
    realtAdapter("ethereum", timestamp),
    realtAdapter("xdai", timestamp),
  ]);
}
export function collateralizedAssets(timestamp: number = 0) {
  return collateralizedAdapter("arbitrum", timestamp, [
    {
      token: "0x52c64b8998eb7c80b6f526e99e29abdcc86b841b", // DSU
      vault: "0x0d49c416103cbd276d9c3cd96710db264e3a0c27",
      collateral: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    },
  ]);
}
export function sweth(timestamp: number = 0) {
  return swethAdapter(timestamp);
}
export function gmd(timestamp: number = 0) {
  return gmdAdapter(timestamp);
}
export function stkaurabal(timestamp: number = 0) {
  return stkaurabalAdapter(timestamp);
}

export async function buck(timestamp: number = 0) {
  const THIRY_MINUTES = 1800;
  if (+timestamp !== 0 && timestamp < +new Date() / 1e3 - THIRY_MINUTES)
    throw new Error("Can't fetch historical data");
  const writes: Write[] = [];
  const {
    data: {
      result: {
        data: {
          content: {
            fields: { type_names, normalized_balances, coin_decimals },
          },
        },
      },
    },
  } = await axios.post("https://fullnode.mainnet.sui.io", {
    jsonrpc: "2.0",
    id: 1,
    method: "sui_getObject",
    params: [
      "0xeec6b5fb1ddbbe2eb1bdcd185a75a8e67f52a5295704dd73f3e447394775402b",
      {
        showContent: true,
      },
    ],
  });
  const usdt =
    "5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";
  const buck =
    "ce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK";
  const usdtBal = normalized_balances[type_names.indexOf(usdt)];
  const buckBal = normalized_balances[type_names.indexOf(buck)];
  const buckDecimals = coin_decimals[type_names.indexOf(buck)];
  const usdtDecimals = coin_decimals[type_names.indexOf(usdt)];
  addToDBWritesList(
    writes,
    "sui",
    "0x" + buck,
    (usdtBal * 10 ** (buckDecimals - usdtDecimals)) / buckBal,
    buckDecimals,
    "BUCK",
    timestamp,
    "buck",
    0.9,
  );

  return writes;
}

export async function mooBvm(timestamp: number = 0) {
  return mooBvmAdapter(timestamp);
}

export async function velgd(timestamp: number = 0) {
  return velgAdapter(timestamp);
}

export async function warlord(timestamp: number = 0) {
  return warlordAdapter(timestamp);
}

export async function salt(timestamp: number = 0) {
  const writes: Write[] = [];
  await wNLXCore(timestamp, writes);
  await dsu(timestamp, writes);
  const chain = "ethereum";
  const api = await getApi(chain, timestamp);
  const price = await api.call({
    abi: "uint256:priceSALT",
    target: "0x22096408044Db49A4eB871640b351Ccacb675ED6",
  });
  const egETH = "0x18f313Fc6Afc9b5FD6f0908c1b3D476E3feA1DD9";
  const egETHPrice = await api.call({
    abi: "uint256:exchangeRateToNative",
    target: egETH,
  });
  const pricesObject = {
    [egETH]: {
      price: egETHPrice / 1e18,
      underlying: "0x0000000000000000000000000000000000000000",
    },
  };
  await getWrites({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "salt",
  });
  addToDBWritesList(
    writes,
    chain,
    "0x0110B0c3391584Ba24Dbf8017Bf462e9f78A6d9F",
    price / 1e18,
    18,
    "SALT",
    timestamp,
    "salty",
    0.95,
  );
  return writes;
}

async function wNLXCore(timestamp: number = 0, writes: Write[] = []) {
  const chain = "core";
  const api = await getApi(chain, timestamp);
  const wNLXCore = "0x2c6bcf5990cc115984f0031d613af1a645089ad6";
  const supply = await api.call({
    abi: "uint256:totalSupply",
    target: wNLXCore,
  });
  const balance = await api.call({
    abi: "function getEthBalance(address) view returns (uint256)",
    target: "0xca11bde05977b3631167028862be2a173976ca11",
    params: wNLXCore,
  });
  const pricesObject = {
    [wNLXCore]: {
      price: balance / supply,
      underlying: "0x0000000000000000000000000000000000000000",
    },
  };
  await getWrites({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "salt",
  });
}

async function dsu(timestamp: number = 0, writes: Write[] = []) {
  const chain = "arbitrum";
  const api = await getApi(chain, timestamp);
  const dsu = "0x52c64b8998eb7c80b6f526e99e29abdcc86b841b";
  const usdc = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
  const treasury = "0x0d49c416103Cbd276d9c3cd96710dB264e3A0c27";
  const supply = await api.call({ abi: "uint256:totalSupply", target: dsu });
  const balance = await api.call({
    abi: "erc20:balanceOf",
    target: usdc,
    params: treasury,
  });
  const pricesObject = {
    [dsu]: { price: (balance * 1e12) / supply, underlying: usdc },
  };
  await getWrites({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "salt",
  });
}

async function kernel(timestamp: number = 0, writes: Write[] = []) {
  const chain = "ethereum";
  const ETH = "0x0000000000000000000000000000000000000000";
  const api = await getApi(chain, timestamp);
  const tokens = [
    {
      address: "0x0bB9aB78aAF7179b7515e6753d89822b91e670C4",
      oracle: "0xde903b83dd8b11abbc28ab195d45fe60145c6e9b",
      abi: "uint256:kUSDPerToken",
      underlying: "0x4c9edd5852cd905f086c759e8383e09bff1e68b3",
    },
    {
      address: "0xf02C96DbbB92DC0325AD52B3f9F2b951f972bf00",
      oracle: "0x8fDDab48DD17dDCeD87730020F4213528042dba3",
    },
    {
      address: "0x513D27c94C0D81eeD9DC2a88b4531a69993187cF",
      oracle: "0x1A9fA10CA260387314185B9D7763164FD3D51226",
    },
  ];
  const pricesObject: any = {};
  for (const {
    address,
    oracle,
    abi = "uint256:getRate",
    underlying = ETH,
  } of tokens) {
    const rate = await api.call({ abi, target: oracle });
    pricesObject[address] = { price: rate / 1e18, underlying };
  }
  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "kelp",
    writes,
  });
}

async function reyaUSD(timestamp: number = 0, writes: Write[] = []) {
  const chain = "reya";
  const api = await getApi(chain, timestamp);
  const pricesObject: any = {};
  const usdc = "0x3B860c0b53f2e8bd5264AA7c3451d41263C933F2";
  const rUSD = "0xa9f32a851b1800742e47725da54a09a7ef2556a3";
  const usdBal = await api.call({
    abi: "erc20:balanceOf",
    target: usdc,
    params: rUSD,
  });
  const supply = await api.call({ abi: "erc20:totalSupply", target: rUSD });
  pricesObject[rUSD] = { price: usdBal / supply, underlying: usdc };
  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "reya-usd",
    writes,
  });
}

async function symboitic(timestamp: number = 0, writes: Write[] = []) {
  const chain = 'ethereum'
  const api = await getApi(chain, timestamp)
  const factory = '0x1BC8FCFbE6Aa17e4A7610F51B888f34583D202Ec'
  const entities = await api.fetchList({ lengthAbi: 'totalEntities', itemAbi: 'entity', target: factory })
  const underlyings = await api.multiCall({ abi: 'address:asset', calls: entities })
  const supplies = await api.multiCall({ abi: 'erc20:totalSupply', calls: entities })
  const bals = await api.multiCall({ abi: 'erc20:balanceOf', calls: underlyings.map((underlying: any, i: any) => ({ target: underlying, params: entities[i] })) })
  const decimalsAll = await api.multiCall({ abi: 'erc20:decimals', calls: entities })
  const uDecimalsAll = await api.multiCall({ abi: 'erc20:decimals', calls: underlyings })
  const pricesObject = {  } as any
  entities.forEach((entity: any, i: any) => {
    const underlying = underlyings[i]
    const bal = bals[i]
    const supply = supplies[i]
    const decimals = decimalsAll[i]
    const uDecimals = uDecimalsAll[i]
    const price = bal * 10 ** (uDecimals - decimals) / supply
    if (isNaN(price)) return;
    pricesObject[entity] = { price, underlying, }
  })
  return getWrites({ chain, timestamp, pricesObject, projectName: "dc-wbtc", writes, })
}

export const adapters = {
  symboitic,
  defiChain,
  shlb,
  metronome,
  buck,
  synthetix,
  glp,
  abracadabra,
  unknownTokens,
  unknownTokens2,
  pods,
  distressed,
  manualInput,
  realt,
  collateralizedAssets,
  sweth,
  gmd,
  stkaurabal,
  mooBvm,
  velgd,
  steadefi,
  teahouse,
  opdx,
  gmdV2,
  salt,
  warlord,
  opal,
  // kernel,   // price taken from unknownTokensV3 instead
  reyaUSD,
};
