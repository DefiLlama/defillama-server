import protocols from '../../src/protocols/data'
import treasuries from '../../src/protocols/treasury'
import entities from '../../src/protocols/entities'
import { IProtocol } from '../../src/types';
import { clearAllDimensionsCache, clearProtocolCacheById } from '../../src/cli/utils/clearProtocolCache';
import { storeTvl2, storeTvl2Options } from '../../src/storeTvlInterval/getAndStoreTvl';
import { humanizeNumber } from '@defillama/sdk';
import evmChainProvidersList from '@defillama/sdk/build/providers.json';
import PromisePool from '@supercharge/promise-pool';
import { deleteProtocolItems, getProtocolItems, initializeTVLCacheDB } from '../../src/api2/db';
import dynamodb from '../../src/utils/shared/dynamodb';
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl, dailyRawTokensTvl, } from '../../src/utils/getLastRecord';
import { importAdapterDynamic } from '../../src/utils/imports/importAdapter';
import * as sdk from '@defillama/sdk';
import { getUnixTimeNow } from '../../src/api2/utils/time';

const tvlNameMap: Record<string, IProtocol> = {}
const allItems = [...protocols, ...treasuries, ...entities]

allItems.forEach((protocol: any) => tvlNameMap[protocol.name] = protocol)
export const tvlProtocolList = allItems
  // .filter(i => i.module !== 'dummy.js')
  .map(i => i.name)


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
  let { chains, skipBlockFetch, dateFrom, dateTo, parallelCount, maxRetries = 3, breakIfTvlIsZero = false, removeTokenTvl = false, removeTokenTvlSymbols = '' } = options;


  if (removeTokenTvl) chains = ''

  const debugStart = +new Date()
  let i = 0
  console.log('Filling last TVL for protocol:', protocol.name)
  let needToRsetHistorical = false
  const rawRecords: any = {}
  const usdTvlRecords: any = {}
  const aggTvlData: any = {} // overall protocol tvl with chain breakdown
  let refillWithCachedData = chains?.length || removeTokenTvl
  const skipSKs: Set<number> = new Set()


  // fetch the final data for comparison
  const aggCachedRecords = await getProtocolItems(dailyTvl, protocol.id, {
    timestampTo: options.dateTo + 86400,
    timestampFrom: options.dateFrom - 86400,
  })
  console.log('Pulled ', aggCachedRecords.length, 'agg tvl records for protocol:', protocol.name, 'from:', new Date(options.dateFrom * 1000).toDateString(), 'to:', new Date(options.dateTo * 1000).toDateString())
  aggCachedRecords.forEach((data: any) => aggTvlData[data.SK] = data)

  if (!process.env.HISTORICAL) {
    needToRsetHistorical = true
    process.env.HISTORICAL = 'true'
  }

  if (refillWithCachedData) {
    chains = chains?.split(',')
    const cacheData = await getProtocolItems(dailyRawTokensTvl, protocol.id, {
      timestampTo: options.dateTo + 86400,
      timestampFrom: options.dateFrom - 86400,
    })

    console.log('Pulled ', cacheData.length, 'raw records for protocol:', protocol.name, 'from:', new Date(options.dateFrom * 1000).toDateString(), 'to:', new Date(options.dateTo * 1000).toDateString())
    cacheData.forEach((data: any) => rawRecords[data.SK] = data)


    if (removeTokenTvl) {

      if (typeof removeTokenTvlSymbols !== 'string' || !removeTokenTvlSymbols.length) {
        console.error('No token symbols provided to remove token tvl');
        return;
      }
      const addressesToRemove: Set<string> = new Set(removeTokenTvlSymbols.split(',').filter((s: string) => s.includes(':')).map((s: string) => s.replace('address:', '').trim().toLowerCase()))
      const symbolsToRemove = removeTokenTvlSymbols.split(',').filter((s: string) => !s.includes(':')).map((s: string) => s.trim().toLowerCase())

      const usdTvlRecordsFromDB = await getProtocolItems(dailyUsdTokensTvl, protocol.id, {
        timestampTo: options.dateTo + 86400,
        timestampFrom: options.dateFrom - 86400,
      })
      console.log('Pulled ', usdTvlRecordsFromDB.length, 'usd tvl records for protocol:', protocol.name, 'from:', new Date(options.dateFrom * 1000).toDateString(), 'to:', new Date(options.dateTo * 1000).toDateString())
      usdTvlRecordsFromDB.forEach((data: any) => usdTvlRecords[data.SK] = data)


      // build symbol mapping
      await buildTokenSymbolMapping({ usdTvlRecords, rawRecords, symbolsToRemove, addressesToRemove })

      console.log('Removing token tvl for symbols:', symbolsToRemove.join(', '), 'and addresses:', Array.from(addressesToRemove).join(', '))


      // go through raw records and remove undesired tokens
      for (let [sk, record] of Object.entries(rawRecords)) {
        const rawRecordClone = JSON.parse(JSON.stringify(record))
        const date = new Date(Number(sk) * 1000).toLocaleDateString()
        let tokensRemoved = false
        for (const chain of Object.keys(record as any)) {
          for (const addr of Object.keys((record as any)[chain])) {
            let checkAddr = addr.toLowerCase()
            if (addressesToRemove.has(checkAddr)) {
              delete (record as any)[chain][addr]
              tokensRemoved = true
              console.log(`Removed token ${addr} on chain ${chain} for date ${date} by address match`);
              continue;
            }
          }
        }

        if (!tokensRemoved) {  // couldnt find any token to remove
          skipSKs.add(Number(sk))
          delete rawRecords[sk]
          continue;
        } else {

          // save original raw record if ever we need it
          const eventItem: any = {
            PK: 'delete#' + dailyRawTokensTvl(protocol.id),
            SK: getUnixTimeNow(),
            SK_ORIG: Number(sk),
            data: rawRecordClone,
            source: 'tvl-adapter-token-removal',
          }

          await dynamodb.putEventData(eventItem)
        }



      }


    }

  }

  try {

    const adapter = await importAdapterDynamic(protocol);
    const start = adapter.start ? Math.round(+new Date(adapter.start) / 1000) : 0;
    dateFrom = dateFrom < start ? start : dateFrom;
    const currentUnixTs = Math.round(Date.now() / 1000);
    dateTo = getClosestDayStartTimestamp(dateTo > currentUnixTs ? currentUnixTs : dateTo);
    const secondsInDay = 24 * 3600;


    if (!skipBlockFetch) {

      if (adapter.timetravel === false && !refillWithCachedData) {  // if we are deliberately passing chains, we assume user knows what they are doing
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
      if (hasNonEvmChain && !refillWithCachedData) {  // if it is not partial refill and there are non-evm chains in the adapter, we throw an error
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

        if (removeTokenTvl) {
          const aggTvlRecord = aggTvlData[unixTimestamp]

          if (skipSKs.has(unixTimestamp)) {
            console.log('Skipping timestamp:', unixTimestamp, 'as no tokens were removed for protocol:', protocol.name);
            return;
          }

          if (!aggTvlRecord) {
            console.error('No agg tvl data found for timestamp:', unixTimestamp, 'in protocol:', protocol.name, `date: ${new Date(unixTimestamp * 1000).toLocaleDateString()}`);
            return;
          }
          options.skipChainsCheck = true
        }

        if (refillWithCachedData) {
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

        if (removeTokenTvl)
          recordItems[id].existingTvlRecord = aggTvlData[response.unixTimestamp]

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
  const { id, protocol, usdTvls, unixTimestamp, existingTvlRecord } = record
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

  if (existingTvlRecord) {
    try {
      // so, this shows up first
      res.pre_tvl = humanizeNumber(existingTvlRecord.tvl)
      res._pre_tvl = +existingTvlRecord.tvl


      Object.entries(existingTvlRecord).forEach(([key, data]: any) => {
        if (key === 'SK') return;

        res['pre_' + key] = humanizeNumber(data)
        res['_pre_' + key] = +data
      })
    } catch (e) {
      console.error('Error parsing record data', e)
    }
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

// atm, this works only for evm chains
async function buildTokenSymbolMapping(params: {
  usdTvlRecords: Record<string, any>,
  rawRecords: Record<string, any>,
  symbolsToRemove: string[],
  addressesToRemove: Set<string>,
}) {
  const { usdTvlRecords, rawRecords, symbolsToRemove, addressesToRemove } = params

  const symbolsToRemoveSet: Set<string> = new Set(symbolsToRemove.map(s => s.toLowerCase()))
  const processedChainSymbols: Set<string> = new Set()
  const chainSymbolMapping: any = {}

  for (const [sk, usdTokenRecord] of Object.entries(usdTvlRecords)) {
    const rawRecord = rawRecords[sk]
    if (!rawRecord) continue;

    for (const key of Object.keys(usdTokenRecord)) {
      if (['tvl', 'pool2', 'staking', 'SK'].includes(key) || key.includes('-')) continue;  // we are looking for chains
      const chain = key
      const chainData = usdTokenRecord[chain]
      if (!chainSymbolMapping[chain]) chainSymbolMapping[chain] = {}

      for (let symbol of Object.keys(chainData)) {
        symbol = symbol.toLowerCase()
        if (!symbolsToRemoveSet.has(symbol)) continue;
        const chainSymbolKey = `${chain}:${symbol}`
        if (processedChainSymbols.has(chainSymbolKey)) continue;

        if (chainSymbolMapping[chain].hasOwnProperty(symbol)) {
          console.log('Symbol mapping found for', chainSymbolKey, chainSymbolMapping[chain][symbol]);
          addressesToRemove.add(chainSymbolMapping[chain][symbol]);
          processedChainSymbols.add(chainSymbolKey)
          continue;
        }

        let rawRecordTokens = Object.keys(rawRecord[chain]).map((addr) => {
          if (chain === 'ethereum' && addr.startsWith('0x')) return addr.toLowerCase()

          if (addr.startsWith(chain + ':0x')) {

            addr = addr.slice(chain.length + 1).toLowerCase()

            if (chainSymbolMapping[chain].hasOwnProperty(addr)) return false
            return addr
          }
          return false
        }).filter(Boolean)


        if (rawRecordTokens.length === 0) continue;
        const symbols = await sdk.api2.abi.multiCall({ calls: rawRecordTokens as any, abi: 'erc20:symbol', chain, permitFailure: true })

        rawRecordTokens.forEach((addr, idx) => {
          let tokenSymbol = symbols[idx] as any
          chainSymbolMapping[chain][addr as any] = tokenSymbol
          if (typeof tokenSymbol === 'string') {
            tokenSymbol = tokenSymbol.toLowerCase()
            chainSymbolMapping[chain][tokenSymbol] = `${chain}:${addr}`.toLowerCase()
            if (tokenSymbol === symbol) {
              console.log('Symbol mapping found for', chainSymbolKey, addr);
              addressesToRemove.add(chainSymbolMapping[chain][tokenSymbol])
              processedChainSymbols.add(chainSymbolKey)
            }
          }
        })
      }

    }
  }
}