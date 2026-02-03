// catch unhandled errors
process.on("uncaughtException", (err) => {
  console.error("uncaught error", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("unhandled rejection", err);
  process.exit(1);
});

import arbitrum from "./arbitrum";
import avax from "./avax";
import gasTokens from "./gasTokens";
import optimism from "./optimism";
import base from "./base";
import arbitrum_nova from "./arbitrum_nova";
import mantle from "./mantle";
import axelar from "./axelar";
import linea from "./linea";
import manta from "./manta";
import symbiosis from "./symbiosis";
import fuel from "./fuel";
import zircuit from "./zircuit";
import morph from "./morph";
import aptos from "./aptosFa";
import unichan from "./unichain";
import flow from "./flow";
import layerzero from "./layerzero";
import initia from "./initia";
import zeroDecimalMappings from "./zeroDecimalMappings";
import anvu from "./anvu";
import monad from "./monad";
import megaeth from "./megaeth";
import pepu from "./pepu";
import * as sdk from "@defillama/sdk";

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
  zeroDecimalMappings, // THIS SHOULD BE AT INDEX 0
  optimism,
  arbitrum,
  avax,
  gasTokens,
  base,
  arbitrum_nova,
  mantle,
  axelar,
  linea,
  manta,
  symbiosis,
  fuel,
  zircuit,
  morph,
  aptos,
  unichan,
  flow,
  layerzero,
  initia, 
  anvu,
  monad,
  megaeth,
  pepu,
].map(normalizeBridgeResults) as Bridge[];

import { batchGet, batchWrite } from "../../utils/shared/dynamodb";
import { getCurrentUnixTimestamp } from "../../utils/date";
import produceKafkaTopics from "../../utils/coins3/produce";
import { chainsThatShouldNotBeLowerCased } from "../../utils/shared/constants";
import { sendMessage } from "../../../../defi/src/utils/discord";

const craftToPK = (to: string) => (to.includes("#") ? to : `asset#${to}`);

async function storeTokensOfBridge(bridge: Bridge, i: number) {
  try {
    const res = await _storeTokensOfBridge(bridge, i);
    return res;
  } catch (e) {
    console.error("Failed to store tokens of bridge", i, e);
    if (process.env.URGENT_COINS_WEBHOOK && new Date('2026-02-21') < new Date())
      await sendMessage(
        `bridge ${i} storeTokens failed with: ${e}`,
        process.env.URGENT_COINS_WEBHOOK,
        true,
      );
    else
      await sendMessage(
        "bridges error but missing urgent webhook",
        process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
        true,
      );
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
    if (record.confidence && record.confidence < 0.97)
      all[record.PK.substr("asset#".length)] = false;
    else all[record.PK.substr("asset#".length)] = true;
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

      let decimals: any, symbol: string;
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

      if (isNaN(decimals) || decimals == '' || decimals == null) return;
      if (i && !decimals) return;
      if (!symbol) return;
      decimals = Number(decimals)

      writes.push({
        PK: `asset#${token.from}`,
        SK: 0,
        created: getCurrentUnixTimestamp(),
        decimals,
        symbol,
        redirect: finalPK,
        confidence: 0.97,
        adapter: `bridges ${i}`,
      });
    }),
  );

  const ddbWriteRes = await batchWrite(writes, true);
  sdk.log(`Wrote ${ddbWriteRes.writeCount} bridge token entries`);
  await produceKafkaTopics(writes, ["coins-metadata"]);
  return tokens;
}
export async function storeTokens() {
  return await Promise.all(
    bridges.map((b: Bridge, i: number) => storeTokensOfBridge(b, i)),
  );
}
