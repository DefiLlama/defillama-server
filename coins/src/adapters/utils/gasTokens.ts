import { getBalance } from "@defillama/sdk/build/eth/index";

export const wrappedGasTokens: { [key: string]: any } = {
  ethereum: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  optimism: "0x4200000000000000000000000000000000000006",
  arbitrum: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  fantom: "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
  avax: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
  bsc: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  aurora: "0xc9bdeed33cd01541e1eed10f90519d2c06fe3feb",
  polygon: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
};
export async function getGasTokenBalance(
  chain: string,
  target: any,
  balances: any,
  block: number | undefined,
  gasTokenDummyAddress: string = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
) {
  if (
    !balances
      .map((b: any) => b.input.target)
      .includes(wrappedGasTokens[chain]) &&
    !balances.map((b: any) => b.input.target).includes(gasTokenDummyAddress)
  )
    return balances;
  const gasTokenBalance = (
    await getBalance({
      target,
      chain: chain as any,
      block,
    })
  ).output;

  const i = balances.indexOf(
    balances.find((b: any) => b == null || b.success == false),
  );
  balances[i] = {
    input: {
      target: wrappedGasTokens[chain] || null,
      params: [target],
    },
    output: gasTokenBalance,
    success: true,
  };

  return balances;
}
