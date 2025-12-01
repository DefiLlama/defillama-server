
import { humanizeNumber } from '@defillama/sdk';
import evmChainProvidersList from '@defillama/sdk/build/providers.json';
import PromisePool from '@supercharge/promise-pool';
import { deleteProtocolItems, getProtocolItems, initializeTVLCacheDB } from '../../src/api2/db';
import { clearAllDimensionsCache, clearProtocolCacheById } from '../../src/cli/utils/clearProtocolCache';
import protocols from '../../src/protocols/data';
import entities from '../../src/protocols/entities';
import treasuries from '../../src/protocols/treasury';
import { storeTvl2, storeTvl2Options } from '../../src/storeTvlInterval/getAndStoreTvl';
import { IProtocol } from '../../src/types';
import { dailyRawTokensTvl, dailyTokensTvl, dailyTvl, dailyUsdTokensTvl, } from '../../src/utils/getLastRecord';
import { importAdapterDynamic } from '../../src/utils/imports/importAdapter';
import dynamodb from '../../src/utils/shared/dynamodb';

const tvlNameMap: Record<string, IProtocol> = {}
const allItems = [...protocols, ...treasuries, ...entities]

allItems.forEach((protocol: any) => tvlNameMap[protocol.name] = protocol)
export const tvlProtocolList = allItems.filter(i => i.module !== 'dummy.js').map(i => i.name)


export async function runTvlAction(ws: any, data: any) {
  const { action, protocolName, ...options } = data;
  const protocol = tvlNameMap[protocolName];

  if (!protocol) {
    console.error('Unknown protocol name:', protocolName);
    return;
  }
  console.log('Running TVL action:', action, 'for protocol:', protocol.name);
  switch (action) {
    case 'tvl-delete-get-list':
      await tvlDeleteGetList(ws, protocol, options)
      break;
    case 'clear-cache':
      await clearProtocolCacheById(protocol.id)
      console.log('Cache cleared for protocol:', protocol.name);
      break;
    case 'clear-all-dimensions-cache':
      await clearAllDimensionsCache()
      break;
    case 'refill-last':
      await fillLast(ws, protocol, options)
      break;
    case 'refill':
      await fillOld(ws, protocol, options)
      break;
    case 'remove-tokens-preview':
      await tvlRemoveTokensPreview(ws, protocol, options)
      break;
    default: console.error('Unknown tvl action:', action); break;
  }
}

async function fillLast(ws: any, protocol: IProtocol, _options: any) {
  const response: any = await storeTvl2({
    unixTimestamp: Math.round(Date.now() / 1000),
    protocol,
    maxRetries: 1,
    useCurrentPrices: true,
    fetchCurrentBlockData: true,
    isRunFromUITool: true,
    breakIfTvlIsZero: false,
  })
  const id = `${protocol.id}-${response.unixTimestamp}`
  recordItems[id] = { id, ...response }
  sendTvlStoreWaitingRecords(ws)
}



async function fillOld(ws: any, protocol: IProtocol, options: any) {
  let { chains, skipBlockFetch, dateFrom, dateTo, parallelCount, maxRetries = 3, breakIfTvlIsZero = false, } = options;
  const debugStart = +new Date()
  let i = 0
  console.log('Filling last TVL for protocol:', protocol.name)
  let needToRsetHistorical = false
  const rawRecords: any = {}

  if (!process.env.HISTORICAL) {
    needToRsetHistorical = true
    process.env.HISTORICAL = 'true'
  }

  if (chains) {
    chains = chains.split(',')
    const cacheData = await getProtocolItems(dailyRawTokensTvl, protocol.id, {
      timestampTo: options.dateTo + 86400,
      timestampFrom: options.dateFrom - 86400,
    })
    console.log('Pulled ', cacheData.length, 'raw records for protocol:', protocol.name, 'from:', new Date(options.dateFrom * 1000).toDateString(), 'to:', new Date(options.dateTo * 1000).toDateString())
    cacheData.forEach((data: any) => rawRecords[data.SK] = data)
  }

  try {

    const adapter = await importAdapterDynamic(protocol);
    const start = adapter.start ? Math.round(+new Date(adapter.start) / 1000) : 0;
    dateFrom = dateFrom < start ? start : dateFrom;
    const currentUnixTs = Math.round(Date.now() / 1000);
    dateTo = getClosestDayStartTimestamp(dateTo > currentUnixTs ? currentUnixTs : dateTo);
    const secondsInDay = 24 * 3600;


    if (!skipBlockFetch) {

      if (adapter.timetravel === false && !chains?.length) {  // if we are delibrately passing chains, we assume user knows what they are doing
        console.error("Adapter doesn't support refilling");
        return;
      }

      const moduleKeys = Object.keys(adapter.module || {});
      let hasNonEvmChain = false;
      for (const key of moduleKeys) {
        // check if chain has tvl function and we have chain rpc
        if (typeof adapter[key] === 'object' && typeof adapter[key].tvl === 'function' && !(evmChainProvidersList as any)[key]) {
          hasNonEvmChain = true;
          break;
        }
      }
      if (hasNonEvmChain && !chains?.length) {  // if it is not partial refill and there are non-evm chains in the adapter, we throw an error
        console.error("Adapter has non-EVM chains, enable skipBlockFetch flag if it supports refilling or provide list of chains to refill");
        return;
      }

    }


    const dates: number[] = []
    while (dateFrom < dateTo) {
      dates.push(dateTo)
      dateTo -= secondsInDay;
    }



    const { errors } = await PromisePool
      .withConcurrency(parallelCount)
      .for(dates)
      .process(async (unixTimestamp: any) => {
        console.log(++i, 'refilling data on', new Date((unixTimestamp) * 1000).toLocaleDateString())
        const options: storeTvl2Options = {
          unixTimestamp,
          protocol,
          maxRetries,
          useCurrentPrices: false,
          isRunFromUITool: true,
          breakIfTvlIsZero,
          skipBlockData: skipBlockFetch,
          overwriteExistingData: true,
        }

        if (chains?.length) {
          options.chainsToRefill = chains
          options.partialRefill = true
          const cacheData = rawRecords[unixTimestamp]
          if (!cacheData) {
            console.error('No cache data found for timestamp:', unixTimestamp, 'in protocol:', protocol.name, `date: ${new Date(unixTimestamp * 1000).toLocaleDateString()}`);
            return;
          }
          options.cacheData = cacheData
        }


        const response: any = await storeTvl2(options)
        const id = `${protocol.id}-${response.unixTimestamp}`
        recordItems[id] = { id, ...response }
        sendTvlStoreWaitingRecords(ws)
      })

    const runTime = ((+(new Date) - debugStart) / 1e3).toFixed(1)
    console.log(`[Done] | runtime: ${runTime}s  `)
    if (errors.length > 0) {
      console.log('Errors:', errors.length)
      console.error(errors)
    }

    console.log('Dry run, no data was inserted')
    sendTvlStoreWaitingRecords(ws)



  } catch (e) {
    console.error('Error setting HISTORICAL to true:', (e as any).message || e);
  }

  if (needToRsetHistorical)
    delete process.env.HISTORICAL
}

async function tvlRemoveTokensPreview(ws: any, protocol: IProtocol, options: any) {
  const { dateFrom, dateTo } = options;

  console.log(
    '[remove-tokens-preview] protocol:',
    protocol.name,
    'dateFrom:',
    new Date(dateFrom * 1000).toDateString(),
    'dateTo:',
    new Date(dateTo * 1000).toDateString(),
  );

  let needToResetHistorical = false;
  if (!process.env.HISTORICAL) {
    needToResetHistorical = true;
    process.env.HISTORICAL = 'true';
  }

  try {
    const adapter = await importAdapterDynamic(protocol);
    const start = adapter.start ? Math.round(+new Date(adapter.start) / 1000) : 0;

    let from = dateFrom < start ? start : dateFrom;
    const currentUnixTs = Math.round(Date.now() / 1000);
    let to = getClosestDayStartTimestamp(dateTo > currentUnixTs ? currentUnixTs : dateTo);
    const secondsInDay = 24 * 3600;

    const dates: number[] = [];
    while (from <= to) {
      dates.push(to);
      to -= secondsInDay;
    }

    const previewRecords: any[] = [];
    let i = 0;

    const { errors } = await PromisePool.withConcurrency(3)
      .for(dates)
      .process(async (unixTimestamp: number) => {
        console.log(
          ++i,
          '[remove-tokens-preview] Processing',
          new Date(unixTimestamp * 1000).toLocaleDateString(),
        );

        const storeOptions: storeTvl2Options = {
          unixTimestamp,
          protocol,
          maxRetries: 3,
          useCurrentPrices: false,
          isRunFromUITool: true,
          breakIfTvlIsZero: false,
          skipBlockData: false,
        };

        const response: any = await storeTvl2(storeOptions);
        if (!response || !response.usdTokenBalances) {
          console.warn('[remove-tokens-preview] No usdTokenBalances for timestamp', unixTimestamp);
          return;
        }

        const usdTokenBalances = response.usdTokenBalances || {};
        const usdTvls = response.usdTvls || {};

        let tvlBefore = 0;
        for (const v of Object.values(usdTvls)) {
          tvlBefore += Number(v) || 0;
        }

        const tokenBreakdown: any[] = [];

        for (const [chainKey, tokensMap] of Object.entries(usdTokenBalances as any)) {
          const chainTokens: any = tokensMap || {};
          const tokenKeys = Object.keys(chainTokens);

          for (const tokenKey of tokenKeys) {
            const usdValue = Number(chainTokens[tokenKey]) || 0;
            tokenBreakdown.push({
              chain: chainKey,
              token: tokenKey,
              value: usdValue,
            });
          }
        }

        const id = `${protocol.id}-${unixTimestamp}`;

        previewRecords.push({
          id,
          protocolName: protocol.name,
          unixTimestamp,
          timeS: new Date(unixTimestamp * 1000).toISOString(),
          tvlBefore,
          tvlAfter: tvlBefore,
          removedValue: 0,
          tokenBreakdown,
        });
      });

    if (errors.length > 0) {
      console.error('[remove-tokens-preview] Errors:', errors);
    }

    previewRecords.sort((a, b) => b.unixTimestamp - a.unixTimestamp);

    console.log('[remove-tokens-preview] DRY MODE - No database modifications will be made');

    ws.send(
      JSON.stringify({
        type: 'tvl-remove-tokens-preview-records',
        data: previewRecords,
        isDryRun: true,
      }),
    );

    console.log(
      '[remove-tokens-preview] Sent preview records:',
      previewRecords.length,
      '(DRY MODE - No DB changes)',
    );
  } catch (e) {
    console.error('[remove-tokens-preview] Error:', (e as any).message || e);
  } finally {
    if (needToResetHistorical) {
      delete process.env.HISTORICAL;
    }
  }
}

function extractTokensMapFromRawRecord(item: any): Record<string, number> {
  const preferredFields = ['tokensUsd', 'tokens', 'rawTokens', 'usdTokens', 'tokenBalances'];

  for (const field of preferredFields) {
    const obj = (item as any)[field];
    const m = normalizeTokenMap(obj);
    if (m && Object.keys(m).length) {
      console.log('[remove-tokens-preview] Using field', field, 'for tokens map');
      return m;
    }
  }

  for (const [field, value] of Object.entries(item)) {
    const m = normalizeTokenMap(value);
    if (m && Object.keys(m).length) {
      console.log('[remove-tokens-preview] Using detected field', field, 'for tokens map');
      return m;
    }
  }

  return {};
}

function normalizeTokenMap(value: any): Record<string, number> | null {
  if (!value || typeof value !== 'object') return null;

  const entries = Object.entries(value);
  if (!entries.length) return null;

  const [sampleKey, sampleVal] = entries[0];

  const isTokenKey = /^[a-z0-9]+:0x[0-9a-fA-F]{40}$/.test(sampleKey);
  if (!isTokenKey) return null;

  if (typeof sampleVal === 'number') {
    const out: Record<string, number> = {};
    for (const [k, v] of entries) {
      out[k.toLowerCase()] = Number(v) || 0;
    }
    return out;
  }

  if (sampleVal && typeof sampleVal === 'object') {
    const hasUsd = 'usd' in (sampleVal as any) || 'tvl' in (sampleVal as any);
    if (!hasUsd) return null;

    const out: Record<string, number> = {};
    for (const [k, v] of entries) {
      const vv: any = v;
      const usdVal = vv.usd ?? vv.tvl ?? 0;
      out[k.toLowerCase()] = Number(usdVal) || 0;
    }
    return out;
  }

  return null;
}

async function resolveTokensFromSymbol(protocol: IProtocol, rawRecords: any[], symbol: string): Promise<string[]> {
  const target = symbol.toLowerCase().trim();
  const matches = new Set<string>();

  for (const item of rawRecords) {
    const tokenSymbolsMap =
      (item.tokenSymbols as Record<string, string>) ||
      (item.tokensSymbols as Record<string, string>) ||
      {};

    for (const [tokenKey, sym] of Object.entries(tokenSymbolsMap)) {
      if ((sym || '').toLowerCase() === target) {
        matches.add(tokenKey);
      }
    }
  }

  if (matches.size === 0) {
    console.warn('[resolveTokensFromSymbol] No tokens found for symbol', symbol, 'in protocol', protocol.name);
  }

  return Array.from(matches);
}

const recordItems: any = {}


export async function tvlStoreAllWaitingRecords(ws: any) {
  const allRecords = Object.entries(recordItems)
  // randomize the order of the records
  allRecords.sort(() => Math.random() - 0.5)

  const { errors } = await PromisePool
    .withConcurrency(11)
    .for(allRecords)
    .process(async ([id, record]: any) => {
      // if (recordItems[id]) delete recordItems[id]  // sometimes users double click or the can trigger this multiple times
      const { storeFn } = record as any
      await storeFn()
      delete recordItems[id]
    })

  if (errors.length > 0) {
    console.log('Errors storing tvl data in db:', errors.length)
    console.error(errors)
  }
  console.log('all tvl records are stored');
  sendTvlStoreWaitingRecords(ws)
}

export function sendTvlStoreWaitingRecords(ws: any) {
  ws.send(JSON.stringify({
    type: 'tvl-store-waiting-records',
    data: Object.values(recordItems).map(getRecordItem),
  }))
}

export function removeTvlStoreWaitingRecords(ws: any, ids: any) {
  if (Array.isArray(ids))
    ids.forEach((id: any) => delete recordItems[id])
  sendTvlStoreWaitingRecords(ws)
}



function getRecordItem(record: any) {
  const { id, protocol, usdTvls, unixTimestamp } = record
  const res: any = {
    id,
    protocolName: protocol.name,
    unixTimestamp,
    timeS: new Date(unixTimestamp * 1000).toISOString(),
  }
  try {
    // so, this shows up first
    res.tvl = humanizeNumber(usdTvls.tvl)
    res._tvl = +usdTvls.tvl


    Object.entries(usdTvls).forEach(([key, data]: any) => {
      res[key] = humanizeNumber(data)
      res['_' + key] = +data
    })
  } catch (e) {
    console.error('Error parsing record data', e)
  }
  return res
}

const deleteRecordsList: any = {}

async function tvlDeleteGetList(ws: any, protocol: IProtocol, data: any) {
  await initializeTVLCacheDB()


  const usdTvlRecords = await getProtocolItems(dailyTvl, protocol.id, {
    timestampFrom: data.dateFrom - 86400,
    timestampTo: data.dateTo + 86400,
  })

  console.log('Pulled ', usdTvlRecords.length || 0, 'tvl records for protocol:', protocol.name, 'from:', new Date(data.dateFrom * 1000).toDateString(), 'to:', new Date(data.dateTo * 1000).toDateString())


  usdTvlRecords.forEach((item: any) => {
    const id = `${protocol.id}-${item.SK}`
    const res = { id, protocol, usdTvls: item, unixTimestamp: item.SK }
    delete item.PK
    delete item.SK
    deleteRecordsList[id] = res
  })

  sendTvlDeleteWaitingRecords(ws)
}

export async function tvlDeleteSelectedRecords(ws: any, data: any) {
  await _deleteTvlRecords(ws, data)
}

export async function tvlDeleteAllRecords(ws: any) {
  await _deleteTvlRecords(ws)
}

async function _deleteTvlRecords(ws: any, ids?: any) {
  if (!ids) ids = Object.keys(deleteRecordsList)
  let protocolIdList = ids.map((p: any) => deleteRecordsList[p]?.protocol?.id)

  // randomize the order of the records
  ids.sort(() => Math.random() - 0.5)
  await initializeTVLCacheDB()

  const { errors } = await PromisePool
    .withConcurrency(7)
    .for(ids)
    .process(async (id: any) => {
      const data = deleteRecordsList[id]
      if (!data)
        return;
      const { protocol, unixTimestamp } = data
      const deleteFrom = unixTimestamp - 1 // -1 to include the from date
      const deleteTo = unixTimestamp + 1 // +1 to include the to date

      for (const tvlFunc of [dailyUsdTokensTvl, dailyTokensTvl, dailyTvl,
        // hourlyTvl, // - we retain hourly in case we want to refill using it for some reason
        // hourlyTokensTvl, hourlyUsdTokensTvl, hourlyTvl
      ]) {

        try {

          await deleteProtocolItems(tvlFunc, { id: protocol.id, timestamp: unixTimestamp })
          console.log('Deleting data for protocol:', protocol.name, 'from:', new Date(deleteFrom * 1000).toDateString(), deleteFrom, 'to:', new Date(deleteTo * 1000).toDateString(), deleteTo, tvlFunc(protocol.id))
          const data = await dynamodb.query({
            ExpressionAttributeValues: {
              ":pk": tvlFunc(protocol.id),
              ":from": deleteFrom,
              ":to": deleteTo,
            },
            KeyConditionExpression: "PK = :pk AND SK BETWEEN :from AND :to",
          });

          const items = data.Items ?? []
          for (const d of items) {
            await dynamodb.delete({
              Key: {
                PK: d.PK,
                SK: d.SK,
              },
            });
          }

        } catch (e) {
          console.error('Error deleting tvl data for protocol:', protocol.name, 'from:', new Date(deleteFrom * 1000).toDateString(), 'to:', new Date(deleteTo * 1000).toDateString(), e);
          console.error((e as any)?.message || e);
          throw e;
        }
      }

      delete deleteRecordsList[id]
    })

  if (errors.length > 0) {
    console.log('Errors deleting tvl data in db:', errors.length)
    // console.error(errors)
    console.error(errors.map((e: any) => e.message || e))
  }
  console.log('deleted tvl records:', ids.length);


  protocolIdList = [...new Set(protocolIdList)]
  for (const protocolId of protocolIdList) {
    try {
      await clearProtocolCacheById(protocolId)
      console.log('Cache cleared for protocol:', protocolId);
    } catch (e) {
      console.error('Error clearing cache for protocol:', protocolId, (e as any)?.message);
    }
  }

  sendTvlDeleteWaitingRecords(ws)
}

export async function tvlDeleteClearList(ws: any) {
  console.log('Clearing delete records list', Object.keys(deleteRecordsList).length)
  Object.keys(deleteRecordsList).forEach((id) => delete deleteRecordsList[id])

  sendTvlDeleteWaitingRecords(ws)
}


export function sendTvlDeleteWaitingRecords(ws: any) {
  ws.send(JSON.stringify({
    type: 'tvl-delete-waiting-records',
    data: Object.values(deleteRecordsList).map(getRecordItem),
  }))
}


function toUNIXTimestamp(ms: number) {
  return Math.round(ms / 1000);
}

function getClosestDayStartTimestamp(timestamp: number) {
  const dt = new Date(timestamp * 1000);
  dt.setUTCHours(0, 0, 0, 0);
  const prevDayTimestamp = toUNIXTimestamp(dt.getTime());
  dt.setUTCHours(24);
  const nextDayTimestamp = toUNIXTimestamp(dt.getTime());
  if (
    Math.abs(prevDayTimestamp - timestamp) <
    Math.abs(nextDayTimestamp - timestamp)
  ) {
    return prevDayTimestamp;
  } else {
    return nextDayTimestamp;
  }
}
