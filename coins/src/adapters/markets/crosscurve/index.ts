import { getCurrentUnixTimestamp } from "../../../utils/date";
import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import providers from "@defillama/sdk/build/providers.json";
import { call } from "@defillama/sdk/build/abi/abi2";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";

const contracts: { [chain: string]: string[] } = {
  fantom: [
    "0x14f8e5851879a18e0fea77b5a17f15523262a99e", // s3crv_e
    "0x2902257ba817e1436b93f9f959ed50b95560b7d5", // s2crv_ar
    "0x740568006c07888216649632aace6620288c7078", // s3crv_o
    "0x9be1ae6175b106f26439cebaf2217d7815f684af", // sav3crv_av
    "0x4636a4efba1c02917d0584505e47bb2d22afe359", // sam3crv_p
    "0xab72e7f7bcfe09a9105f24ffe45038f50f45ca5c", // sb3pool_b
    "0x904603366bc8acf881a35cd4c7e0d514f0477ffc", // s4pool_ba
    "0x795b38c85d6f1524b434f14aa37c1c808c2bbd6b", // sx3crv_g

    "0xf515a8055e503ac86d96f0ffd0bf9121a668b8ab", // sUSDC_m
    "0x286931c8a360c0375ec174f04feabf9a707c94e5", // sUSDB_bl
    "0xdc06708bc4cc5b1907854f687860b96e6600d6e5", // sUSDCe_l
    "0x5acc8f3b6fe2c7f9736bfaeef3a0870b1e2295a9", // sUSDC_t
    "0xc8506d96647a69a2f9bfbb5fd467db700827a2ba", // s3Pool_c
    "0x8e23f9719bbe179a68cb18595ec564116e4024eb", // sFrUsdt_t
    "0xeb23ef286a00e96e5dc82d5f25e203c43a4b5cc4", // sUSDt_t

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

    "0xb2137e9d90f0752089538e3c1254f36da2e8a871", // sWETH.e_av
    "0x6b4846ba707c0b760d9c77918f70536312e264c4", // sWETH_p
    "0x1f7759134c9f35d9b2c81002f7fac6848a13ca35", // sETH_b
    "0x91c573fb29acaf7ab242b1de8b720787d43b5cd5", // swfrxETH_f
    "0xee8758e413e305b1bed9e0bd147457c8254004be", // sWETH_gn
    "0xa8e44394edfe922b5fdc722d87954aa5e605463c", // sWETH_me
    "0x46aC86bFEC8a9f48d51620fBB1a4C26DeD1219b9", // sWETH_mo
  ],
  sonic: [
    "0xf47Be881f4a0a3557819fc917ec722b4dad627bb", // sCRV_e
    "0x1329C1ca6819B6A0550151Ee802E62C704Cee589", // sCRV_ar
    "0xae3afe90fdda54c1bb7a0c4cd40c6d46c3b471cc", // sCRV_ba
    "0xa28693eea6145709b60dfafa1b2c14456ff0b083", // sCRV_o
    "0x0d773d1ba78dfe11739393d6526ad3c48bb7dd3c", // sCRV_p
    "0x313e51513cb252ba39c37a70a69c64efc404ee8b", // sCRV_g
    "0xa4e6e9b68fd4f32a22cb890b411cf68206479928", // sCRV_fr
    "0xcc62792dc59ad5d3d287fe5b5304fe01147e9527", // sCRV_ft
  ],
};

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
  const writes: Write[] = [];

  await Promise.all(
    Object.keys(contracts).map(async (chain: string) => {
      let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
      const api = await getApi(chain, t, true);

      const [originalTokens, sourceChainIds, symbols, decimals, supplies] =
        await Promise.all([
          api.multiCall({
            calls: contracts[chain],
            abi: abi.originalToken,
          }),
          api.multiCall({
            calls: contracts[chain],
            abi: abi.chainIdFrom,
          }),
          api.multiCall({
            calls: contracts[chain],
            abi: "erc20:symbol",
          }),
          api.multiCall({
            calls: contracts[chain],
            abi: "erc20:decimals",
          }),
          api.multiCall({
            calls: contracts[chain],
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
          }).catch((_r) => undefined),
        ),
      );

      const underlyingPrices = await Promise.all(
        originalTokens.map((o: string, i: number) =>
          getTokenAndRedirectData([o], chains[i], t),
        ),
      );

      contracts[chain].map((c: string, i: number) => {
        if (!underlyingPrices[i].length || !balances[i]) return;
        const price =
          (underlyingPrices[i][0].price * balances[i]) / supplies[i];
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
    }),
  );

  return writes;
}
