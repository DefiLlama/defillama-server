import providers from "@defillama/sdk/build/providers.json";
import tokenMappingsImport from "../tokenMapping.json";
import moreTokenMappingsImport from "../tokenMapping_added.json";
import { Endpoint } from "./types";

export const burl: string = "https://www.okx.com";
export const gasAddress: string = "0x0000000000000000000000000000000000000000";
export const chainIdMap: { [key: string]: number } = {};

Object.keys(providers).map((c: string) => {
  chainIdMap[c] = providers[c as keyof typeof providers].chainId;
});

export const chainGasTokens: { [chain: string]: any } = {};
readGasTokensFromMappingFile(tokenMappingsImport);
readGasTokensFromMappingFile(moreTokenMappingsImport);

export const endpoints: { [key: string]: Endpoint } = {
  "current-price": {
    path: "/api/v5/wallet/token/current-price",
    method: "POST",
    body: undefined,
    params: {
      chainIndex: "string",
      tokenAddress: "string",
    },
  },
};

function readGasTokensFromMappingFile(importedMapping: object) {
  const tokenMappings = importedMapping as {
    [chain: string]: { [token: string]: any };
  };
  Object.keys(tokenMappings).map((chain: string) => {
    if (!(gasAddress in tokenMappings[chain])) return;
    chainGasTokens[chain] = {
      decimals: tokenMappings[chain][gasAddress].decimals,
      symbol: tokenMappings[chain][gasAddress].symbol,
    };
  });
}
