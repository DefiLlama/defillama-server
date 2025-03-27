import { Token } from "./index";

const tokenAddresses: { [symbol: string]: { [chain: string]: string } } = {
  nUSD: {
    reference: "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    ethereum: "0x1B84765dE8B7566e4cEAF4D0fD3c5aF52D3DdE4F",
    optimism: "0x67C10C397dD0Ba417329543c1a40eb48AAa7cd00",
    cronos: "0x396c9c192dd323995346632581BEF92a31AC623b",
    bsc: "0x23b891e5c62e0955ae2bd185990103928ab817b3",
    polygon: "0xb6c473756050de474286bed418b77aeac39b02af",
    fantom: "0xED2a7edd7413021d440b09D654f3b87712abAB66",
    boba: "0x6B4712AE9797C199edd44F897cA09BC57628a1CF",
    metis: "0x961318Fc85475E125B99Cc9215f62679aE5200aB",
    canto: "0xD8836aF2e565D3Befce7D906Af63ee45a57E8f80",
    arbitrum: "0x2913E812Cf0dcCA30FB28E6Cac3d2DCFF4497688",
    avax: "0xCFc37A6AB183dd4aED08C204D1c2773c0b1BDf46",
    dfk: "0x3AD9DFE640E1A9Cc1D9B0948620820D975c3803a",
    aurora: "0x07379565cD8B0CaE7c60Dc78e7f601b34AF2A21c",
    harmony: "0xED2a7edd7413021d440b09D654f3b87712abAB66",
    blast: "0x3194B0A295D87fDAA54DF852c248F7a6BAF6c6e0",
  },
  nETH: {
    reference: "ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    optimism: "0x809DC529f07651bD43A172e8dB6f4a7a0d771036",
    fantom: "0x67C10C397dD0Ba417329543c1a40eb48AAa7cd00",
    boba: "0x96419929d7949D6A801A6909c145C8EEf6A40431",
    metis: "0x931B8f17764362A3325D30681009f0eDd6211231",
    moonbeam: "0x3192Ae73315c3634Ffa217f71CF6CBc30FeE349A",
    dogechain: "0x9F4614E4Ea4A0D7c4B1F946057eC030beE416cbB",
    canto: "0x09fEC30669d63A13c666d2129230dD5588E2e240",
    klaytn: "0xCD6f29dC9Ca217d0973d3D21bF58eDd3CA871a86",
    arbitrum: "0x3ea9B0ab55F34Fb188824Ee288CeaEfC63cf908e",
    avax: "0x19E1ae0eE35c0404f835521146206595d37981ae",
    harmony: "0x0b5740c6b4a97f90eF2F0220651Cca420B868FfB",
    blast: "0xce971282faac9fabcf121944956da7142cccc855",
  },
  nUSD2: {
    reference: "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    optimism: "0x2c6d91accc5aa38c84653f28a80aec69325bdd12",
  },
};

export default async function bridge(): Promise<Token[]> {
  const tokens: Token[] = [];

  Object.keys(tokenAddresses).map((symbol: string) =>
    Object.keys(tokenAddresses[symbol]).map((c: string) => {
      if (c == "reference") return;
      tokens.push({
        from: `${c}:${tokenAddresses[symbol][c]}`,
        to: tokenAddresses[symbol].reference,
        symbol,
        decimals: 18,
      });
    }),
  );

  return tokens;
}
