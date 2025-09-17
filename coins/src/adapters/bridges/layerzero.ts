import {
  cacheSolanaTokens,
  getSymbolAndDecimals,
} from "../../scripts/coingeckoUtils";
import { chainsThatShouldNotBeLowerCased } from "../../utils/shared/constants";
import setEnvSecrets from "../../utils/shared/setEnvSecrets";
import { fetch } from "../utils";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { chainIdMap } from "./celer";

export const layerZeroChainMapping: { [key: string]: string } = {
  "BNB Chain": "bsc",
  "Celo Mainnet": "celo",
  "Klaytn Mainnet Cypress": "klaytn",
  "zkSync Era Mainnet": "zksync_era",
  "Core Blockchain Mainnet": "core",
  "Aurora Mainnet": "aurora",
  DFK: "dfk_chain",
  "Rari Chain": "rari_chain",
  "Fuse Mainnet": "fuse",
  "OKXChain Mainnet": "okx",
  "Horizen EON Mainnet": "eon",
  TelosEVM: "telos",
  "XPLA Mainnet": "xpla",
  "PGN (Public Goods Network)": "pgn",
  "Shrapnel Subnet": "shrapnel",
  "Astar zkEVM": "astar_zkevm",
  Gravity: "gravity_bridge",
  "Merit Circle": "mc",
  "Orderly Mainnet": "orderly",
  "Conflux eSpace": "conflux",
  "Meter Mainnet": "meter",
  Real: "real",
  Xlayer: "x_layer",
  "Polygon zkEVM": "polygon_zkevm",
  Gnosis: "xdai",
  Avalanche: "avax",
  "opBNB Mainnet": "op_bnb",
  "Arbitrum Nova": "arbitrum_nova",
  Lightlink: "lightlink_phoenix",
  "Plume Mainnet": "plume_mainnet",
};

const nonEvmMapping: { [key: string]: string } = {
  solana: "solana",
  aptos: "aptos",
  ton: "ton",
  movement: "move",
  "sui-mainnet": "sui",
};

export default async function main() {
  const mappings: any[] = [];
  await getMoreLayerZeroMappings(mappings);

  const chains = (await fetch(
    "https://metadata.layerzero-api.com/v1/metadata",
  )) as { [chain: string]: any };

  const chainKeys: { [key: string]: number } = {};
  Object.keys(chains).map((chain) => {
    if (chain.endsWith("-testnet")) return;
    if (!chains[chain].chainDetails) return;

    const { chainType, chainId, nativeChainId } = chains[chain].chainDetails;
    if (chainType != "evm" && !nonEvmMapping[chain]) {
      // console.log(`${chain} is not an evm chain`);
      return;
    }

    const destinationChainSlug =
      chainIdMap[chainId] ?? chainIdMap[nativeChainId];
    if (!destinationChainSlug) {
      // console.log(`destination chain ${chain} is not in the chainIdMap`);
      return;
    }

    chainKeys[chain] = chainId ?? nativeChainId;
  });

  Object.keys(chains).map((chain) => {
    if (!chains[chain].tokens) return;
    const chainId = chainKeys[chain];
    if (!chainId && !nonEvmMapping[chain]) return;
    const destinationChainSlug = chainIdMap[chainId] ?? nonEvmMapping[chain];

    Object.keys(chains[chain].tokens).map((destinationAddress: string) => {
      const { peggedTo, decimals, symbol } =
        chains[chain].tokens[destinationAddress];
      if (!peggedTo || !decimals || !symbol) {
        // console.log(`${destinationAddress} not enough info about peg`);
        return;
      }
      const { address: originAddress, chainName } = peggedTo;
      const sourceChainSlug =
        chainIdMap[chainKeys[chainName]] ?? nonEvmMapping[chainName];
      if (!sourceChainSlug) {
        // console.log(`source chain ${chainName} is not in the chainIdMap`);
        return;
      }

      mappings.push({
        from: `${destinationChainSlug}:${destinationAddress}`,
        to: `${sourceChainSlug}:${originAddress}`,
        symbol,
        decimals,
      });
    });
  });

  return mappings;
}

async function getMoreLayerZeroMappings(mappings: any[]) {
  await setEnvSecrets();
  const solanaTokensPromise = cacheSolanaTokens();

  const res = await fetch(
    "https://gist.githubusercontent.com/vrtnd/02b1125edf1afe2baddbf1027157aa31/raw/5cab2009357b1acb8982e6a80e66b64ab7ea1251/mappings.json",
  );

  const decimalQueries: { [chain: string]: string[] } = {};
  const additionalMappings: { [chain: string]: string[] } = {};
  const tokenQueries: { [chain: string]: string[] } = {};
  res.map(({ from, to }: any) => {
    const [chain, address] = to.split(":");
    const [sourceChain, sourceAddress] = from.split(":");

    if (!(sourceChain in tokenQueries)) tokenQueries[sourceChain] = [];
    tokenQueries[sourceChain].push(sourceAddress.toLowerCase());

    if (!(sourceChain in decimalQueries)) decimalQueries[sourceChain] = [];
    decimalQueries[sourceChain].push(
      chainsThatShouldNotBeLowerCased.includes(sourceChain)
        ? sourceAddress.toLowerCase()
        : sourceAddress,
    );

    if (!(chain in decimalQueries)) decimalQueries[chain] = [];
    decimalQueries[chain].push(
      chainsThatShouldNotBeLowerCased.includes(chain)
        ? address.toLowerCase()
        : address,
    );

    if (!(to in additionalMappings)) additionalMappings[to] = [];
    additionalMappings[to].push(
      chainsThatShouldNotBeLowerCased.includes(chain)
        ? from.toLowerCase()
        : from,
    );
  });

  const oftTokens: { [chain: string]: string } = {};
  await Promise.all(
    Object.keys(tokenQueries).map((chain: string) =>
      multiCall({
        chain,
        calls: tokenQueries[chain].map((target) => ({ target })),
        abi: "address:token",
        withMetadata: true,
        permitFailure: true,
      })
        .then((r) => {
          if (!r.length) return;
          r.map((call: any) => {
            if (call.success == true)
              oftTokens[
                `${chain}:${call.input.target}`
              ] = `${chain}:${call.output}`;
          });
        })
        .catch((e) => {
          e;
          chain;
        }),
    ),
  );

  await solanaTokensPromise;
  const decimals: { [coin: string]: string } = {};
  await Promise.all(
    Object.keys(decimalQueries).map((chain: string) =>
      multiCall({
        chain,
        calls: decimalQueries[chain].map((target) => ({ target })),
        abi: "erc20:decimals",
        withMetadata: true,
        permitFailure: true,
      })
        .then((r) => {
          if (!r.length) return;
          r.map((call: any) => {
            if (call.success == true)
              decimals[`${chain}:${call.input.target}`] = call.output;
          });
        })
        .catch(async () => {
          await Promise.all(
            decimalQueries[chain].map((target) =>
              getSymbolAndDecimals(target, chain, "").catch((e) => {
                e;
                target;
                chain;
              }),
            ),
          );
        }),
    ),
  );

  // from is destination in codebase
  // from is source in json
  res.map(({ to, symbol }: any) => {
    if (!decimals[to] || !additionalMappings[to]) return;

    additionalMappings[to].map((from: string) => {
      mappings.push({
        to: oftTokens[to] ?? to,
        from: oftTokens[from] ?? from,
        symbol,
        decimals: decimals[from],
      });
      mappings.push({
        to: oftTokens[from] ?? from,
        from: oftTokens[to] ?? to,
        symbol,
        decimals: decimals[to],
      });
    });
  });

  return mappings;
}
