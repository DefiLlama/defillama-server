import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";
const projectName = "unknownTokensV3";

const slot0Abi =
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)";

const config: any = {
  // [token]: uniV3pool
  blast: {
    "0x216a5a1135a9dab49fa9ad865e0f22fe22b5630a":
      "0x017f31dc55144f24836c2566ed7dc651256c338a", // PUMP
  },
  bsc: {
    "0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3":
      "0xfc18301B94a77D91015bb90D5249827c506846Ae", // stBTC
  },
  map: {
    "0x756af1d3810a01d3292fad62f295bbcc6c200aea":
      "0xc6a16fac07c059689873988fa4c635d45ca170e2", // LSGS
  },
  mantle: {
    "0x029d924928888697d3F3d169018d9d98d9f0d6B4":
      "0x417ed45c1adf3a3eb21fba7a40a4e2e4c3405050", // Muito
  },
  ethereum: {
    "0xf1B99e3E573A1a9C5E6B2Ce818b617F0E664E86B":
      "0x82c427AdFDf2d245Ec51D8046b41c4ee87F0d29C", // oSQTH
    "0xBEF26Bd568e421D6708CCA55Ad6e35f8bfA0C406":
      "0x26FA8b07DcE29Fb1F0fb3C889E01b59dEbADeFdA", // BCUT
    "0x0bB9aB78aAF7179b7515e6753d89822b91e670C4":
      "0xF77C8cE2b0944505Ee8AFf5E5Bd0f39C10F35C5c", // kUSD
    "0xf02C96DbbB92DC0325AD52B3f9F2b951f972bf00":
      "0xeAb1724Bae42bDAA74cB2269f22db0A763E79969", // krETH
    "0x513D27c94C0D81eeD9DC2a88b4531a69993187cF":
      "0xd992d160d0617CfBA73a2D2AbF098dF4F630Ed37", // ksETH
    "0x8dd09822e83313adca54c75696ae80c5429697ff":
      "0x1A8E1Fb29479c73B215045C5Ea8367257ee16E43", // SIFU
    "0x97Ad75064b20fb2B2447feD4fa953bF7F007a706":
      "0x6dcba3657EE750A51A13A235B4Ed081317dA3066", // BERASTONE
    "0x437cc33344a0B27A429f795ff6B469C72698B291":
      "0x970A7749EcAA4394C8B2Bf5F2471F41FD6b79288", // wM
  },
  kroma: {
    "0x61e0D34b5206Fa8005EC1De8000df9B9dDee23Db":
      "0x62330719f844dB255EF135f977176D72497dc881", // spETH
  },
  bsquared: {
    "0x796e4d53067ff374b89b2ac101ce0c1f72ccaac2":
      "0xdc4224cea3afdddbfc6aa23ffeaa1c50a59a6493", // uBTC
  },
  arbitrum: {
    "0xba3e932310cd1dbf5bd13079bd3d6bae4570886f":
      "0x695F5B9Bc0b5A41fb4eB0B1fB5DFA0F6d389A079", // yBTC
  },
  imx: {
    "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a":
      "0x42514fa59DD4689573D35119CF9E0bda218e15ee", // aUSD
  },
};

export function unknownTokensV3(timestamp: number = 0) {
  return Promise.all(
    Object.keys(config).map((chain) => getTokenPrice(chain, timestamp)),
  );
}

async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  const pricesObject: any = {};
  const pools: any = Object.values(config[chain]);
  const tokens = Object.keys(config[chain]);
  const token0s = await api.multiCall({ abi: "address:token0", calls: pools });
  const token1s = await api.multiCall({ abi: "address:token1", calls: pools });
  const slot0s = await api.multiCall({ abi: slot0Abi, calls: pools });
  const tokens0Decimals = await api.multiCall({
    abi: "erc20:decimals",
    calls: token0s,
  });
  const tokens1Decimals = await api.multiCall({
    abi: "erc20:decimals",
    calls: token1s,
  });

  slot0s.forEach((v: any, i: number) => {
    const token = tokens[i].toLowerCase();
    let token0 = token0s[i].toLowerCase();
    let price =
      Math.pow(1.0001, v.tick) *
      10 ** (tokens0Decimals[i] - tokens1Decimals[i]);
    if (token !== token0) price = 1 / price;
    pricesObject[token] = {
      underlying: token0 === token ? token1s[i] : token0,
      price,
    };
  });
  return getWrites({ chain, timestamp, pricesObject, projectName });
}
