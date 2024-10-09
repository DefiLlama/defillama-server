import { Token } from "./index";
import { fetch, formatExtraTokens } from "../utils";
// import tokenMappings from "../tokenMapping_added.json";
import tokenMappings2 from "../tokenMapping.json";

export default async function bridge(): Promise<Token[]> {
  const bridge = (
    await fetch("https://static.optimism.io/optimism.tokenlist.json")
  ).tokens as any[];

  const ethUrlMap = bridge
    .filter((token) => token.chainId === 1)
    .reduce((all, token) => {
      all[token.logoURI] = token;
      return all;
    }, {});

  const tokens: Token[] = [];
  bridge.map((optToken) => {
    const ethToken = ethUrlMap[optToken.logoURI];
    if (ethToken === undefined) return;
    let chain;
    switch (optToken.chainId) {
      case 10:
        chain = "optimism";
        break;
      case 8453:
        chain = "base";
        break;
      default:
        return;
    }
    tokens.push({
      from: `${chain}:${optToken.address}`,
      to: `ethereum:${ethToken.address}`,
      symbol: optToken.symbol,
      decimals: optToken.decimals,
    });
  });
  const response = [tokens, extraTokens];

  // Object.entries(tokenMappings).forEach(([chain, tokenMap]) => {
  //   const tokens: [string, string, string, number][] = [];
  //   Object.entries(tokenMap).map(
  //     ([from, { to, symbol, decimals: decimalsNum }]) => {
  //       const decimals = +decimalsNum;
  //       if (isNaN(decimals))
  //         throw new Error("Is not valid token mapping: " + from);
  //       // const from_lowerCase = from.toLowerCase()
  //       // if (from_lowerCase !== from)
  //       //   tokens.push([from_lowerCase, to, symbol, decimals]);
  //       let token = from;
  //       if (!["solana"].includes(chain)) token = token.toLowerCase();
  //       tokens.push([token, to, symbol, decimals]);
  //     },
  //   );
  //   response.push(formatExtraTokens(chain, tokens));
  // });

  Object.entries(tokenMappings2).forEach(([chain, tokenMap]) => {
    const tokens: [string, string, string, number][] = [];
    Object.entries(tokenMap).map(
      ([from, { to, symbol, decimals: decimalsNum }]) => {
        const decimals = +decimalsNum;
        if (isNaN(decimals))
          throw new Error("Is not valid token mapping: " + from);
        // const from_lowerCase = from.toLowerCase()
        // if (from_lowerCase !== from)
        //   tokens.push([from_lowerCase, to, symbol, decimals]);
        let token = from;
        if (!["solana"].includes(chain)) token = token.toLowerCase();
        tokens.push([token, to, symbol, decimals]);
      },
    );
    response.push(formatExtraTokens(chain, tokens));
  });

  return response.flat();
}

const extraTokens = formatExtraTokens("optimism", [
  // SNX synths
  [
    "0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9",
    "ethereum:0x57ab1ec28d129707052df4df418d58a2d46d5f51",
    "sUSD",
    18,
  ],
  [
    "0xc5db22719a06418028a40a9b5e9a7c02959d0d08",
    "ethereum:0xbbc455cb4f1b9e4bfc4b73970d360c8f032efee6",
    "sLINK",
    18,
  ],
  [
    "0xe405de8f52ba7559f9df3c368500b6e6ae6cee49",
    "ethereum:0x5e74c9036fb86bd7ecdcb084a0673efc32ea31cb",
    "sETH",
    18,
  ],
  [
    "0x298b9b95708152ff6968aafd889c6586e9169f1d",
    "ethereum:0xfe18be6b3bd88a2d2a7f928d00292e7a9963cfc6",
    "sBTC",
    18,
  ],
  // BitAnt
  [
    "0x5029c236320b8f15ef0a657054b84d90bfbeded3",
    "ethereum:0x15ee120fd69bec86c1d38502299af7366a41d1a6",
    "BitANT",
    18,
  ],
  // WETH
  [
    "0x4200000000000000000000000000000000000006",
    "ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "WETH",
    18,
  ],
]);
