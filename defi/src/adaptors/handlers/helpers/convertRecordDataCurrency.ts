import { IJSON } from "../../data/types"
import { IRecordAdapterRecordChainData, IRecordAdaptorRecordData } from "../../db-utils/adaptor-record"

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
export const convertDataToUSD = (data: IRecordAdaptorRecordData) => {
    const rrr = Object.entries(data).reduce((acc, [chain, chainData]) => {
        if (typeof chainData === 'number') acc[chain] = chainData
        else {
            acc[chain] = Object.entries(chainData).reduce((acc, [protocol, protocolData]) => {
                if (protocol === 'error') return acc
                else if (typeof protocolData === 'number') acc[protocol] = protocolData
                return acc
            }, {} as IRecordAdapterRecordChainData)
        }
        return acc
    }, data)
    return rrr
}
