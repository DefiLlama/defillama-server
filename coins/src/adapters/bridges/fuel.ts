import { fetch } from "../utils";
import { getTokenAndRedirectDataMap } from "../utils/database";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { chainIdMap } from "./celer";
import { Token as DbMap } from "./index";

const gasTokenAddress = "0x0000000000000000000000000000000000000000";

type Network = {
  chainId: number;
  decimals: number;
  address?: string;
  assetId?: string;
};

type ListData = {
  symbol: string;
  name: string;
  networks: Network[];
};

type Token = {
  address: string;
  chain: string;
  decimals: number;
};

type SourceData = {
  symbol: string;
  key: string;
  confidence: number;
};

type Mappings = {
  [name: string]: {
    sources: Token[];
    destination?: Token;
    sourceData?: SourceData;
  };
};

function aggregateBridgeMappings(tokenList: ListData[]): Mappings {
  const mappings: Mappings = {};
  tokenList.map((asset: ListData) => {
    mappings[asset.name] = { sources: [] };
    asset.networks.map((network: Network) => {
      if (network.chainId == 9889) {
        mappings[asset.name].destination = {
          address: network.assetId ?? gasTokenAddress,
          chain: "fuel",
          decimals: network.decimals,
        };
        return;
      }
      const chain = chainIdMap[network.chainId];
      if (!chain) return;
      mappings[asset.name].sources.push({
        chain,
        address: network.address?.toLowerCase() ?? gasTokenAddress,
        decimals: network.decimals,
      });
    });
  });

  return mappings;
}

async function fetchValidDbSources(mappings: Mappings): Promise<void> {
  const priceQueries: { [chain: string]: string[] } = {};
  Object.keys(mappings).map((name: string) => {
    mappings[name].sources.map(({ chain, address }: Token) => {
      if (!(chain in priceQueries)) priceQueries[chain] = [];
      priceQueries[chain].push(address);
    });
  });

  const keyMap: { [key: string]: string } = {};
  Object.keys(mappings).map((name: string) =>
    mappings[name].sources.map((token: Token) => {
      keyMap[`${token.chain}:${token.address}`] = name;
    }),
  );

  await Promise.all(
    Object.keys(priceQueries).map((chain: string) =>
      getTokenAndRedirectDataMap(
        Object.values(priceQueries[chain]),
        chain,
        getCurrentUnixTimestamp(),
      ).then((res) => {
        Object.keys(res).map((address: string) => {
          const { chain, redirect, symbol, confidence } = res[address];
          if (!confidence) return;
          const name = keyMap[`${chain}:${address}`];
          if (mappings[name].sourceData) return;
          mappings[name].sourceData = {
            key: redirect ?? `${chain}:${address}`,
            confidence,
            symbol,
          };
        });
      }),
    ),
  );
}

function formDbMaps(mappings: Mappings): DbMap[] {
  const tokens: any[] = [];
  Object.values(mappings).map(({ destination, sourceData }) => {
    if (!sourceData) return;
    tokens.push({
      from: `${destination?.chain}:${destination?.address}`,
      symbol: sourceData.symbol,
      decimals: destination?.decimals,
      to: sourceData.key,
    });
  });

  return tokens;
}

export default async function bridge(): Promise<DbMap[]> {
  const tokenList: ListData[] = await fetch(
    "https://verified-assets.fuel.network/",
  );
  const mappings: Mappings = aggregateBridgeMappings(tokenList);
  await fetchValidDbSources(mappings);
  return formDbMaps(mappings);
}
