import { fetch, formatExtraTokens } from "../utils";
import { Token } from "./index";

export default async function bridge(): Promise<Token[]> {
  const [
    bridgeTokensOld,
    bridgeTokensNew,
    bridgeTokenDetails
  ] = await Promise.all([
    fetch(
      "https://raw.githubusercontent.com/0xngmi/bridge-tokens/main/data/penultimate.json"
    ),
    fetch(
      "https://raw.githubusercontent.com/ava-labs/avalanche-bridge-resources/main/avalanche_contract_address.json"
    ).then((r) => Object.entries(r)),
    fetch(
      "https://raw.githubusercontent.com/ava-labs/avalanche-bridge-resources/main/token_list.json"
    )
  ]);

  const tokens: Token[] = formatExtraTokens(
    "avax",
    bridgeTokensOld.map((token: any) => [
      token["Avalanche Token Address"],
      "ethereum:" + token["Ethereum Token Address"],
      token["Avalanche Token Symbol"],
      token["Avalanche Token Decimals"]
    ])
  );
  bridgeTokensNew.map((newBridgeToken) => {
    const tokenName = newBridgeToken[0].split(".")[0];
    const tokenData = bridgeTokenDetails[tokenName];
    if (tokenData.nativeNetwork !== "ethereum") return;
    tokens.push({
      from: `avax:${newBridgeToken[1]}`,
      to: `${tokenData.nativeNetwork}:${tokenData.nativeContractAddress}`,
      symbol: newBridgeToken[0],
      decimals: tokenData.denomination
    });
  });

  return tokens;
}
