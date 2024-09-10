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
      }),
    ),
  );

  const underlyingPrices = await Promise.all(
    originalTokens.map((o: string, i: number) =>
      getTokenAndRedirectData([o], chains[i], t),
    ),
  );

  const writes: Write[] = [];
  contracts.map((c: string, i: number) => {
    if (!underlyingPrices[i].length) return;
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
