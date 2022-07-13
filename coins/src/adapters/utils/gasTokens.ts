import { getBalance } from "@defillama/sdk/build/eth/index";

export const wrappedGasTokens: { [key: string]: any } = {
  ethereum: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
};
export async function getGasTokenBalance(
  chain: string,
  target: any,
  balances: any,
  gasTokenDummyAddress: string = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
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
      chain: chain as any
    })
  ).output;
  balances.push({
    input: {
      target: wrappedGasTokens[chain] || null,
      params: [target]
    },
    output: gasTokenBalance,
    success: true
  });

  balances = balances.filter(
    (b: any) => b.input.target != gasTokenDummyAddress
  );

  return balances;
}
