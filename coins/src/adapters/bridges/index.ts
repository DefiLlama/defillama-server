// catch unhandled errors
process.on("uncaughtException", (err) => {
  console.error('uncaught error', err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error('unhandled rejection', err);
  process.exit(1);
});

// import anyswap from "./anyswap";
import arbitrum from "./arbitrum";
import avax from "./avax";
// import bsc from "./bsc";
import brc20 from "./brc20";
import fantom from "./fantom";
import era from "./era";
import gasTokens from "./gasTokens";
//import harmony from "./harmony";
import optimism from "./optimism";
import polygon from "./polygon";
// import solana from "./solana";
// import xdai from "./xdai";
import cosmos from "./cosmos";
import synapse from "./synapse";
import base from "./base";
import neon_evm from "./neon_evm";
import arbitrum_nova from "./arbitrum_nova";
import mantle from "./mantle";
import axelar from "./axelar";
import linea from "./linea";
import manta from "./manta";
import astrzk from "./astrzk";
import zklink from "./zklink";
import celer from "./celer";
import fraxtal from "./fraxtal";



export type Token =
  | {
    from: string;
    to: string;
    decimals: number;
    symbol: string;
  }
  | {
    from: string;
    to: string;
    getAllInfo: () => Promise<{
      from: string;
      to: string;
      decimals: number;
      symbol: any;
    }>;
  };
type Bridge = () => Promise<Token[]>;

export const chainsThatShouldNotBeLowerCased = ["solana", "bitcoin"];
function normalizeBridgeResults(bridge: Bridge) {
  return async () => {
    const tokens = await bridge();
    return tokens.map((token) => {
      const chain = token.from.split(":")[0];
      if (chainsThatShouldNotBeLowerCased.includes(chain)) {
        return token;
      }
      return {
        ...token,
        from: token.from.toLowerCase(),
        to: token.to.toLowerCase(),
      };
    });
  };
}
export const bridges = [
  optimism,
  // anyswap,
  arbitrum,
  avax,
  brc20,
  //bsc,
  fantom,
  era,
  gasTokens,
  //harmony,
  polygon,
  // solana
  //xdai
  cosmos,
  synapse,
  base,
  neon_evm,
  arbitrum_nova,
  mantle,
  axelar,
  linea,
  manta,
  astrzk,
  zklink,
  celer,
  fraxtal,
].map(normalizeBridgeResults) as Bridge[];

import { batchGet, batchWrite } from "../../utils/shared/dynamodb";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { Coin, batchWrite2, readCoins2, translateItems } from "../../../coins2";

const craftToPK = (to: string) => (to.includes("#") ? to : `asset#${to}`);

async function storeTokensOfBridge(bridge: Bridge, i: number) {
  try {
    const res = await _storeTokensOfBridge(bridge, i);
    return res
  } catch (e) {
    console.error("Failed to store tokens of bridge", i, e);
  }
}

async function _storeTokensOfBridge(bridge: Bridge, i: number) {
  const tokens = await bridge();

  const alreadyLinked = (
    await batchGet(
      tokens.map((t) => ({
        PK: `asset#${t.from}`,
        SK: 0,
      })),
    )
  ).reduce((all, record) => {
    all[record.PK.substr("asset#".length)] = true;
    return all;
  }, {});

  const unlisted = tokens.filter((t) => alreadyLinked[t.from] !== true);
  const toAddressToRecord = {} as { [PK: string]: string };
  const redirectsNeeded: any[] = [];
  const redirectMap: { [redirect: string]: string } = {};

  const toRecords = await batchGet(
    unlisted.map((t) => ({
      PK: craftToPK(t.to),
      SK: 0,
    })),
  );

  await Promise.all(
    toRecords.map(async (record) => {
      const toPK = record.PK;
      if (record.price != null) {
        toAddressToRecord[toPK] = toPK;
      } else if (record.redirect) {
        redirectsNeeded.push({
          PK: record.redirect,
          SK: 0,
        });
        redirectMap[record.redirect] = toPK;
      }
    }),
  );

  const redirectRecords = await batchGet(redirectsNeeded);
  redirectRecords.map((record) => {
    const toPK = redirectMap[record.PK];
    if (record.price) toAddressToRecord[toPK] = record.PK;
  });

  const writes: any[] = [];
  await Promise.all(
    unlisted.map(async (token) => {
      const finalPK = toAddressToRecord[craftToPK(token.to)];
      if (finalPK === undefined) return;

      let decimals: number, symbol: string;
      if ("getAllInfo" in token) {
        try {
          const newToken = await token.getAllInfo();
          decimals = newToken.decimals;
          symbol = newToken.symbol;
        } catch (e) {
          console.log("Skipping token", finalPK, e);
          return;
        }
      } else {
        decimals = token.decimals;
        symbol = token.symbol;
      }
      writes.push({
        PK: `asset#${token.from}`,
        SK: 0,
        created: getCurrentUnixTimestamp(),
        decimals,
        symbol,
        redirect: finalPK,
      });
    }),
  );

  const writes2: Coin[] = [];
  const data = await readCoins2(
    tokens.map((t: Token) => ({
      key: t.to.includes("coingecko#") ? t.to.replace("#", ":") : t.to,
      timestamp: getCurrentUnixTimestamp(),
    })),
  );
  tokens.map(async (token) => {
    const to = token.to.includes("coingecko#")
      ? token.to.replace("#", ":")
      : token.to;
    if (!(to in data)) return;
    let PK: string = token.from.includes("coingecko#")
      ? token.from.replace("#", ":")
      : token.from.substring(token.from.indexOf("#") + 1);
    const chain = PK.split(":")[0];
    let decimals: number, symbol: string;
    if ("getAllInfo" in token) {
      try {
        const newToken = await token.getAllInfo();
        decimals = newToken.decimals;
        symbol = newToken.symbol;
      } catch (e) {
        console.log("Skipping token", PK, e);
        return;
      }
    } else {
      decimals = token.decimals;
      symbol = token.symbol;
    }
    writes2.push({
      timestamp: getCurrentUnixTimestamp(),
      price: data[to].price,
      confidence: Math.min(data[to].confidence, 0.9),
      key: PK,
      chain,
      adapter: "bridges",
      symbol,
      decimals,
    });
  });

  await batchWrite(writes, true);
  await batchWrite2(writes2, true, undefined, `bridge index ${i}`);
  return tokens;
}
export async function storeTokens() {
  return await Promise.all(
    bridges.map((b: Bridge, i: number) => storeTokensOfBridge(b, i)),
  );
}
