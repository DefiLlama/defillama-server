const protocolName = "Carbon Defi";
const chainToChange = "tac";
const symbolToChange = "WIF";
const tokenTarget = `tac:0x0000000000000000000000000000000000000000`;
const start = Math.round(new Date("2025-08-28").getTime() / 1e3); // 28
// run once for hourly, once for daily


import dynamodb, { getHistoricalValues } from "../utils/shared/dynamodb";
import {
  hourlyTokensTvl,
  hourlyTvl,
  hourlyUsdTokensTvl,
  hourlyRawTokensTvl,
  dailyTokensTvl,
  dailyTvl,
  dailyUsdTokensTvl,
  dailyRawTokensTvl,
} from "../utils/getLastRecord";
import { getProtocol } from "./utils";
import { saveProtocolItem, initializeTVLCacheDB, closeConnection } from "../api2/db";
import { coins } from "@defillama/sdk";

const tokensRaw = hourlyRawTokensTvl;
const tokensKey = hourlyTokensTvl;
const usdTokensKey = hourlyUsdTokensTvl;
const tvlKey = hourlyTvl;

// set params above 
// run once for hourly, once for daily
async function main() {
  await initializeTVLCacheDB();

  const protocol = getProtocol(protocolName);
  const data = (await getHistoricalValues(tvlKey(protocol.id))).filter((t) => t.SK > start);
  for (const d of data ?? []) {
    const rawAmounts = await dynamodb.get({
      PK: tokensRaw(protocol.id),
      SK: d.SK,
    });

    const tokenTargetAmount = rawAmounts.Item?.tvl[tokenTarget] ?? 0;

    if (tokenTargetAmount === 0) continue;

    const priceRes = await coins.getPrices([tokenTarget], d.SK);
    const { price, decimals, symbol } = priceRes[tokenTarget];
    if (!price) continue;

    const usdAmount = (tokenTargetAmount * price) / 10 ** decimals;

    let [usdTokensAmounts, tokensAmounts, tvlAmounts]: any[] = await Promise.all([
      dynamodb.get({
        PK: usdTokensKey(protocol.id),
        SK: d.SK,
      }),
      dynamodb.get({
        PK: tokensKey(protocol.id),
        SK: d.SK,
      }),
      dynamodb.get({
        PK: tvlKey(protocol.id),
        SK: d.SK,
      }),
    ]);

    let oldUsdAmount = usdTokensAmounts.Item?.[chainToChange][symbolToChange] ?? 0;
    if (oldUsdAmount == 0) throw new Error(`No old usd amount for ${d.SK}`);

    const extraTvl = usdAmount - oldUsdAmount;

    // repair TVLs 
    if (usdTokensAmounts.Item) {
      console.log(`Old usd amounts tvl: ${usdTokensAmounts.Item.tvl[symbolToChange]}`);
      console.log(`Old usd amounts chain: ${usdTokensAmounts.Item[chainToChange][symbolToChange]}`);
      usdTokensAmounts.Item.tvl[symbol] = usdTokensAmounts.Item.tvl[symbolToChange] - extraTvl;
      usdTokensAmounts.Item[chainToChange][symbol] = usdTokensAmounts.Item[chainToChange][symbolToChange] - extraTvl;
      delete usdTokensAmounts.Item.tvl[symbolToChange];
      delete usdTokensAmounts.Item[chainToChange][symbolToChange];
    }

    // THIS MAY NEED ADJUSTING FOR DECIMALS 
    if (tokensAmounts.Item) {
      console.log(`Old tokens amounts tvl: ${tokensAmounts.Item.tvl[symbolToChange]}`);
      console.log(`Old tokens amounts chain: ${tokensAmounts.Item[chainToChange][symbolToChange]}`);
      tokensAmounts.Item.tvl[symbol] = tokensAmounts.Item.tvl[symbolToChange];
      tokensAmounts.Item[chainToChange][symbol] = tokensAmounts.Item[chainToChange][symbolToChange];
      delete tokensAmounts.Item.tvl[symbolToChange];
      delete tokensAmounts.Item[chainToChange][symbolToChange];
    }

    if (tvlAmounts.Item) {
      console.log(`Old tvl amounts tvl: ${tvlAmounts.Item.tvl}`);
      console.log(`Old tvl amounts chain: ${tvlAmounts.Item[chainToChange]}`);
      tvlAmounts.Item.tvl += extraTvl;
      tvlAmounts.Item[chainToChange] += extraTvl;
    }

    // Update DynamoDB
    await dynamodb.put(usdTokensAmounts.Item);
    await dynamodb.put(tokensAmounts.Item);
    await dynamodb.put(tvlAmounts.Item);

    // Update API2 (PostgreSQL)
    const writeOptions = { overwriteExistingData: true };

    // Prepare data objects for API2 - extract only the data fields (exclude PK, SK)
    const { PK: _, SK: __, ...usdTokensDataFields } = usdTokensAmounts.Item;
    const { PK: ___, SK: ____, ...tokensDataFields } = tokensAmounts.Item;
    const { PK: _____, SK: ______, ...tvlDataFields } = tvlAmounts.Item;

    // Save hourly data to API2
    await Promise.all([
      saveProtocolItem(
        hourlyUsdTokensTvl,
        { id: protocol.id, timestamp: d.SK, data: usdTokensDataFields },
        writeOptions
      ),
      saveProtocolItem(hourlyTokensTvl, { id: protocol.id, timestamp: d.SK, data: tokensDataFields }, writeOptions),
      saveProtocolItem(hourlyTvl, { id: protocol.id, timestamp: d.SK, data: tvlDataFields }, writeOptions),
    ]);

    console.log(`stored for ${d.SK}`);
  }

  await closeConnection();
}

main(); // ts-node defi/src/cli/setHistoricalTokensWithApi2.ts
