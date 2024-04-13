import { fetch, formatExtraTokens } from "../utils";

const chain = 'polygon'
export default async function bridge() {
  const tokens = (
    await fetch("https://raw.githubusercontent.com/maticnetwork/polygon-token-list/dev/src/tokens/polygon.json")
  ) as any[];

  const polygonTokens = tokens
    .filter((token) => token.chainId === 137 && token.extensions?.originTokenAddress && token.extensions.originTokenAddress !== '0x0000000000000000000000000000000000000000' && token.extensions?.originTokenNetwork === 0)
    .map((token) => {
      const bridged = token.extensions.originTokenAddress;
      return {
        from: `${chain}:${token.address}`,
        to: `ethereum:${bridged}`,
        symbol: token.symbol,
        decimals: token.decimals
      };
    })
    .concat(extraTokens);
  const zkEVMTokens = tokens
    .filter((token) => token.chainId === 1101 && token.extensions?.originTokenAddress && token.extensions.originTokenAddress !== '0x0000000000000000000000000000000000000000' && token.extensions?.originTokenNetwork === 0)
    .map((token) => {
      const bridged = token.extensions.originTokenAddress;
      return {
        from: `polygon_zkevm:${token.address}`,
        to: `ethereum:${bridged}`,
        symbol: token.symbol,
        decimals: token.decimals
      };
    })
  return polygonTokens.concat(zkEVMTokens)
}

const extraTokens = formatExtraTokens(chain, []);
