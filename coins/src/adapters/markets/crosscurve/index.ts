import { getCurrentUnixTimestamp } from "../../../utils/date";
import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import providers from "@defillama/sdk/build/providers.json";
import { call } from "@defillama/sdk/build/abi/abi2";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";

const chain = "fantom";

const contracts: string[] = [
  "0x14f8e5851879a18e0fea77b5a17f15523262a99e", // s3crv_e
  "0x2902257ba817e1436b93f9f959ed50b95560b7d5", // s2crv_ar
  "0x740568006c07888216649632aace6620288c7078", // s3crv_o
  "0x9be1ae6175b106f26439cebaf2217d7815f684af", // sav3crv_av
  "0x4636a4efba1c02917d0584505e47bb2d22afe359", // sam3crv_p
  "0xab72e7f7bcfe09a9105f24ffe45038f50f45ca5c", // sb3pool_b
  "0x904603366bc8acf881a35cd4c7e0d514f0477ffc", // s4pool_ba
  "0x795b38c85d6f1524b434f14aa37c1c808c2bbd6b", // sx3crv_g

  "0x0c935328a69155dd43aa57f23288d868bae440fe", // sWETH_e
  "0x77e1886bf34d7dc0dcf8d5407ed6a239b66ae2ee", // sWETH_ar
  "0x66917b3b128760295bf48a5382951bc63bb1768e", // sWETH_o
  "0xc6cd50e6085a5f037b638813483dd244e3e4bcaa", // sWETH_ba
  "0x389b72effa551ddec93cbb9259b27780f9f7a043", // sWETH_bl
  "0xf91eb98d5ff86718234ac0e400175a05df6cfcf1", // sWETH_m
  "0x62c8359b2734e5dd6adb528ad2c78159a3f2607e", // sWETH_l
  "0x8fd195b2ff1506c1c26091422768cc2a40285ce7", // sWETH_t

  "0x2daDf589F616876E21c8BA63f59Af764479A422d", // s2BTC_e
  "0x636cc0ab717be347FF3ACF9763afBaF7D2Cf47A9", // s2BTC_ar
  "0x513a766F7b4269590850D566B64916D691a96927", // s2BTC_o
  "0x9BDe91F652B78F6Ab22084bDE4ECc0767f360Df0", // sBTC.b_av
  "0xcaF01AC3FA0aC969dA7a399388f02791F0471955", // sWBTC_p
  "0x210B2AddE074a220bCEA99051f90acD049977814", // sBTCB_b
  "0xfEa2c4377f556e35B1ddE85e80a2816F601c8D6c", // scbBTC_ba
  "0xa6c60E1C7431561971398b79Fe6B0Bf02E9f0E6C", // sWBTC_l
];

const portal: string = "0xAc8f44ceCa92b2a4b30360E5bd3043850a0FFcbE";

const abi: { [fn: string]: Object } = {
  originalToken: {
    inputs: [],
    name: "originalToken",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  chainIdFrom: {
    inputs: [],
    name: "chainIdFrom",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
};

const chainIdMap: { [id: number]: string } = {};
Object.keys(providers).map((c: string) => {
  chainIdMap[providers[c as keyof typeof providers].chainId] = c;
});

export async function crosscurve(timestamp: number = 0) {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);

  const [originalTokens, sourceChainIds, symbols, decimals, supplies] =
    await Promise.all([
      api.multiCall({
        calls: contracts.map((target: string) => ({
          target,
        })),
        abi: abi.originalToken,
      }),
      api.multiCall({
        calls: contracts.map((target: string) => ({
          target,
        })),
        abi: abi.chainIdFrom,
      }),
      api.multiCall({
        calls: contracts.map((target: string) => ({
          target,
        })),
        abi: "erc20:symbol",
      }),
      api.multiCall({
        calls: contracts.map((target: string) => ({
          target,
        })),
        abi: "erc20:decimals",
      }),
      api.multiCall({
        calls: contracts.map((target: string) => ({
          target,
        })),
        abi: "erc20:totalSupply",
      }),
    ]);

  const chains = sourceChainIds.map((i: number) => chainIdMap[i]);
  const balances = await Promise.all(
    originalTokens.map((target: string, i: number) =>
      call({
        target,
        params: portal,
        chain: chains[i],
        abi: "erc20:balanceOf",
      }).catch(_r => undefined)
    ),
  );

  const underlyingPrices = await Promise.all(
    originalTokens.map((o: string, i: number) =>
      getTokenAndRedirectData([o], chains[i], t),
    ),
  );

  const writes: Write[] = [];
  contracts.map((c: string, i: number) => {
    if (!underlyingPrices[i].length || !balances[i]) return;
    const price = (underlyingPrices[i][0].price * balances[i]) / supplies[i];
    addToDBWritesList(
      writes,
      chain,
      c,
      price,
      decimals[i],
      symbols[i],
      timestamp,
      "crosscurve",
      1,
    );
  });

  return writes;
}
