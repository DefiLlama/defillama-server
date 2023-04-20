import { fetch, formatExtraTokens } from "../utils";

export default async function bridge() {
  const bridge = (
    await fetch("https://bridge.arbitrum.io/token-list-42161.json")
  ).tokens as any[];

  return bridge
    .map((token) => {
      if (token.extensions == null)
        return {
          from: `arbitrum:${token.address}`,
          to: `null`,
          symbol: token.symbol,
          decimals: token.decimals
        };
      const bridged = token.extensions.bridgeInfo[1].tokenAddress;
      return {
        from: `arbitrum:${token.address}`,
        to: `ethereum:${bridged}`,
        symbol: token.symbol,
        decimals: token.decimals
      };
    })
    .filter((t) => t.to != "null")
    .concat(extraTokens);
}

const extraTokens = formatExtraTokens("arbitrum", [
  [
    "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A",
    "ethereum:0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3",
    "MIM",
    18
  ],
  [
    "0xDBf31dF14B66535aF65AaC99C32e9eA844e14501",
    "ethereum:0xeb4c2781e4eba804ce9a9803c67d0893436bb27d",
    "renBTC",
    8
  ],
  [
    "0x9ef758ac000a354479e538b8b2f01b917b8e89e7",
    "polygon:0x3dc7b06dd0b1f08ef9acbbd2564f8605b4868eea",
    "XDO",
    18
  ]
]);
