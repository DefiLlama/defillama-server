import getBlock from "../utils/block";
import { getTokenInfo } from "../utils/erc20";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";

const contracts: { [chain: string]: { [token: string]: string } } = {
  ethereum: {
    GVR: "0x84FA8f52E437Ac04107EC1768764B2b39287CB3e",
    GVR_OLD: '0xF33893DE6eB6aE9A67442E066aE9aBd228f5290c',
  },
  harmony: {
    Frax: "0xeB6C08ccB4421b6088e581ce04fcFBed15893aC3",
    WrappedEther: "0xF720b7910C6b2FF5bd167171aDa211E226740bfe",
    Aave: "0xcF323Aad9E522B93F11c352CaA519Ad0E14eB40F",
    Sushi: "0xBEC775Cb42AbFa4288dE81F387a9b1A3c4Bc552A",
    FXS: "0x775d7816afbEf935ea9c21a3aC9972F269A39004",
    AAG: "0xAE0609A062a4eAED49dE28C5f6A193261E0150eA",
    BUSD: "0xE176EBE47d621b984a73036B9DA5d834411ef734",
    DAI: "0xEf977d2f931C1978Db5F6747666fa1eACB0d0339",
    Tether: "0x3C2B8Be99c50593081EAA2A724F0B8285F5aba8f",
    WBTC: "0x3095c7557bCb296ccc6e363DE01b760bA031F2d9",
    USDC: "0x985458E523dB3d53125813eD68c274899e9DfAb4",
    ETH: "0x6983D1E6DEf3690C4d616b13597A09e6193EA013",
    bscBNB: "0xb1f6E61E1e113625593a22fa6aa94F8052bc39E0",
    bscBUSD: "0x0aB43550A6915F9f67d0c454C2E90385E6497EaA",
  },
  klaytn: {
    USDK: "0xd2137fdf10bd9e4e850c17539eb24cfe28777753",
  },
  arbitrum: {
    GOLD: "0xc4be0798e5b5b1C15edA36d9B2D8c1A60717fA92",
  },
  bsc: {
    DOGECOLA: "0xe320df552e78d57e95cf1182b6960746d5016561", // OLD dogecola contract
    GVR: "0xaFb64E73dEf6fAa8B6Ef9a6fb7312d5C4C15ebDB", // GVR
    GVR2: "0xF33893DE6eB6aE9A67442E066aE9aBd228f5290c",
    PANCAKE_LP_ABNB_BNB: "0x272c2CF847A49215A3A1D4bFf8760E503A06f880",
  },
};

export default async function getTokenPrices(chain: string, timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const writes: Write[] = [];

  const tokenInfos = await getTokenInfo(
    chain,
    Object.values(contracts[chain]),
    block,
  );

  Object.values(contracts[chain]).map((a: string, i: number) => {
    addToDBWritesList(
      writes,
      chain,
      a,
      0,
      tokenInfos.decimals[i].output,
      tokenInfos.symbols[i].output,
      timestamp,
      "distressed",
      1.01,
    );
  });

  return writes;
}
