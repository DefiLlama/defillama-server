import {
  cacheSolanaTokens,
  getSymbolAndDecimals,
} from "../../scripts/coingeckoUtils";
import { getCurrentUnixTimestamp } from "../../utils/date";
import {
  chainsThatShouldNotBeLowerCased,
  nullAddress,
} from "../../utils/shared/constants";
import setEnvSecrets from "../../utils/shared/setEnvSecrets";
import { fetch } from "../utils";
// import setEnvSecrets from "../../utils/shared/setEnvSecrets";
import { getTokenAndRedirectData } from "../utils/database";
import { OFTs } from "./layerzeroOFTs";
import { multiCall } from "@defillama/sdk/build/abi/abi2";

const lzNullAddress = "\\\\n";

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

export default async function main() {
  // await setEnvSecrets();
  const mappings: any[] = [];
  await getMoreLayerZeroMappings(mappings);

  const uniquePks: { [chain: string]: string[] } = {};

  Object.keys(OFTs).map((symbol: string) => {
    const chains = Object.keys(OFTs[symbol]);
    if (chains.length == 1) return;
    chains.map((lzChain: string) => {
      const chain = layerZeroChainMapping[lzChain] ?? lzChain.toLowerCase();
      if (!(chain in uniquePks)) uniquePks[chain] = [];
      let addresses = OFTs[symbol][lzChain];
      const index = addresses.indexOf(lzNullAddress);
      if (index > -1) {
        addresses.splice(index, 1);
        addresses.push(nullAddress);
      }
      uniquePks[chain].push(...addresses.map((a) => a.toLowerCase()));
    });
  });

  const timestamp = getCurrentUnixTimestamp();
  const coinData: { [pk: string]: any } = {};
  await Promise.all(
    Object.keys(uniquePks).map((chain: string) =>
      getTokenAndRedirectData(uniquePks[chain], chain, timestamp, 20000).then(
        (r) => {
          if (!r.length) return;
          r.map((data) => {
            const pk = `${data.chain}:${data.address}`;
            coinData[pk] = data;
          });
        },
      ),
    ),
  );

  const decimals: { [pk: string]: any } = {};
  await Promise.all(
    Object.keys(uniquePks).map((chain: string) =>
      multiCall({
        chain,
        calls: uniquePks[chain]
          .filter((t) => t != nullAddress)
          .map((target) => ({ target })),
        abi: "erc20:decimals",
        withMetadata: true,
      })
        .then((r) => {
          if (!r.length) return;
          r.map((call: any) => {
            const address = call.input.target;
            decimals[`${chain}:${address}`] = call.output;
          });
        })
        .catch((e) => {
          e;
        }),
    ),
  );

  Object.keys(OFTs).map((symbol: string) => {
    const PKs: string[] = [];
    const coinDatas: any[] = [];

    Object.keys(OFTs[symbol]).map((lzChain: string) => {
      const chain = layerZeroChainMapping[lzChain] ?? lzChain.toLowerCase();
      OFTs[symbol][lzChain].map((address: string) => {
        const PK = `${chain}:${address.toLowerCase()}`;
        if (PK in coinData) coinDatas.push(coinData[PK]);
        PKs.push(PK);
      });
    });

    if (!coinDatas.length) return;

    const sources: string[] = [];
    coinDatas.map((data) => {
      sources.push(data.redirect ?? `asset#${data.chain}:${data.address}`);
    });

    const coingeckoSources = sources.filter((v) => v.startsWith("coingecko#"));
    const notBridged = coingeckoSources.filter(
      (v) => v.indexOf("bridged") == -1,
    );

    const to = notBridged.length
      ? notBridged[0]
      : coingeckoSources.length
      ? coingeckoSources[0]
      : sources[0];

    PKs.map((from) => {
      if (!decimals[from]) return;

      mappings.push({
        from,
        to,
        symbol,
        decimals: decimals[from],
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

// const chains: string[] = [];
// Object.keys(OFTs).map((symbol) => {
//   Object.keys(OFTs[symbol]).map((chain) => {
//     if (chains.includes(chain)) return;
//     if (chain in layerZeroChainMapping) return;
//     chains.push(chain);
//   });
// });

// chains; // ts-node coins/src/adapters/bridges/layerzero.ts
