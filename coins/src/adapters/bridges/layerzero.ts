import { getCurrentUnixTimestamp } from "../../utils/date";
import { nullAddress } from "../../utils/shared/constants";
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
  "Lightlink": "lightlink_phoenix",
};

export default async function main() {
  // await setEnvSecrets();
  const mappings: any[] = [];
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

// const chains: string[] = [];
// Object.keys(OFTs).map((symbol) => {
//   Object.keys(OFTs[symbol]).map((chain) => {
//     if (chains.includes(chain)) return;
//     if (chain in layerZeroChainMapping) return;
//     chains.push(chain);
//   });
// });

// chains; // ts-node coins/src/adapters/bridges/layerzero.ts
