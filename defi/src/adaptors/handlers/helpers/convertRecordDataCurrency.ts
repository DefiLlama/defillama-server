import { getFulfilledResults, getRejectedResults } from "@defillama/dimension-adapters/adapters/utils/runAdapter"
import axios from "axios"
import allSettled from "promise.allsettled"
import { formatTimestampAsDate, getClosestDayStartTimestamp } from "../../../utils/date"
import { IJSON } from "../../data/types"
import { IRecordAdapterRecordChainData, IRecordAdaptorRecordData } from "../../db-utils/adaptor-record"
import getDataPoints from "../../utils/getDataPoints"

interface IPricesResponse {
    chaintoken: string
    symbol: string,
    decimals: number
    prices: Array<{
        price: number
        timestamp: number
    }>
}

export type IGetHistoricalPricesResponse = {
    symbol: IPricesResponse['symbol']
    decimals: IPricesResponse['decimals']
    prices: IJSON<IPricesResponse['prices'][number]>
}
const HISTORICAL_PRICES_BASE_URL = 'https://coins.llama.fi/coin/timestamps'
const getHistoricalPrices = async (token: string, fromTimestamp: number): Promise<IPricesResponse> => {
    const pricesResponse = ((await axios.post(HISTORICAL_PRICES_BASE_URL, {
        coin: token,
        timestamps: getDataPoints(fromTimestamp * 1000)
    })).data as IPricesResponse)
    return {
        ...pricesResponse,
        chaintoken: token
    }
}

const getHistoricalPricesByTokens = async (tokens: string[], fromTimestamp: number): Promise<IJSON<IGetHistoricalPricesResponse>> => {
    const prices = await allSettled(tokens.map(token => getHistoricalPrices(token, fromTimestamp)))
    const okPrices = getFulfilledResults(prices)
    getRejectedResults(prices).forEach((e) => {
        const err = e as Error
        console.error(`Error getHistoricalPricesByTokens at ${fromTimestamp} ${tokens.join(', ')} ${err.message}`)
    })
    return okPrices.reduce((acc, curr) => {
        acc[curr.chaintoken] = {
            ...curr,
            prices: curr.prices.reduce((acc, curr) => {
                const timestampKey = getClosestDayStartTimestamp(curr.timestamp)
                acc[timestampKey] = curr
                return acc
            }, {} as IGetHistoricalPricesResponse['prices'])
        }
        return acc
    }, {} as IJSON<IGetHistoricalPricesResponse>)
}

const prices = {} as IJSON<IGetHistoricalPricesResponse>
const addToPricesObject = async (token: string, fromTimestamp: number) => {
    const r = await getHistoricalPricesByTokens([token], fromTimestamp)
    Object.entries(r).forEach(([token, pricesObj]) => {
        prices[token] = pricesObj
    })
}

export const convertDataToUSD = async (data: IRecordAdaptorRecordData, timestamp: number) => {
    const rrr = await Object.entries(data).reduce(async (accP, [chain, chainData]) => {
        let acc = await accP
        if (typeof chainData === 'number') acc[chain] = chainData
        else {
            acc[chain] = await Object.entries(chainData).reduce(async (accP, [protocol, protocolData]) => {
                let acc = await accP
                if (protocol === 'error') return acc
                else if (typeof protocolData === 'number') acc[protocol] = protocolData
                else if (typeof protocolData === 'object') acc[protocol] = await Object.entries(protocolData).reduce(async (accP, [chaintoken, balance]) => {
                    let acc = await accP
                    if (!prices?.[chaintoken]?.prices?.[timestamp]?.price) await addToPricesObject(chaintoken, timestamp)
                    if (prices?.[chaintoken]?.prices?.[timestamp]?.price)
                        acc += prices[chaintoken].prices[timestamp].price * Number(balance)
                    return acc
                }, Promise.resolve(0))
                return acc
            }, Promise.resolve({}) as Promise<IRecordAdapterRecordChainData>)
        }
        return acc
    }, Promise.resolve(data) as Promise<IRecordAdaptorRecordData>)
    return rrr
}

/* (async () => {
    const prices = await getHistoricalPricesByTokens(["ethereum:0x0000000000000000000000000000000000000000"], Date.UTC(2022, 10, 1) / 1000)
    console.log(JSON.stringify(prices, null, 2))
    const res = await convertBalanceToUSD(
        prices,
        {
            'ethereum': {
                "v1": {
                    "ethereum:0x0000000000000000000000000000000000000000": "1"
                }
            }
        },
        Date.UTC(2022, 10, 16) / 1000
    )
    console.log(res)
})() */