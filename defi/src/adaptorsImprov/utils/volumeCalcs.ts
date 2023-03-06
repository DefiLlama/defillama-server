import { formatTimestampAsDate, getTimestampAtStartOfDayUTC } from "../../utils/date";
import { IJSON, ProtocolAdaptor } from "../data/types";
import { AdaptorRecord, AdaptorRecordType, IRecordAdaptorRecordData } from "../db-utils/adaptor-record";
import { ExtraTypes, IGeneralStats, ProtocolAdaptorSummary } from "../handlers/getOverviewProcess";
import { ONE_DAY_IN_SECONDS } from "../handlers/getProtocol";

import getDataPoints from "./getDataPoints";

const sumAllVolumes = (breakdownVolumes: IRecordAdaptorRecordData, protVersion?: string) => {
    if (breakdownVolumes) {
        return Object.values(breakdownVolumes)
            .reduce<number>((acc, volume) => {
                if (typeof volume === 'number') return acc
                return acc + Object.entries(volume)
                    .filter(([protV, _]) => protVersion ? protV === protVersion : true)
                    .reduce<number>(sumObject, 0)
            }, 0)
    }
    else return 0
}

const sumObject = (acc: number, [_key, current]: [string, any]): number => {
    if (typeof current === 'object') {
        return acc + Object.entries(current)
            // .filter(([tokenSymbol, _]) => tokenSymbolFilter ? tokenSymbol === tokenSymbolFilter : true)
            .reduce<number>((vacc, [_key, current]) => sumObject(vacc, [_key, current]), 0)
    }
    else {
        return acc + Number(current)
    }
}

const calcNdONdChange = (
    dexs: Pick<ProtocolAdaptorSummary, 'recordsMap'>[],
    dex2Substract?: ProtocolAdaptorSummary,
    baseTimestamp: number = (Date.now() / 1000) - ONE_DAY_IN_SECONDS,
    nDaysChange: number = 1
) => {
    const yesterdaysTimestamp = getTimestampAtStartOfDayUTC(baseTimestamp);
    const timestampNd = yesterdaysTimestamp - (nDaysChange * ONE_DAY_IN_SECONDS)

    let yesterdaysVolumeAll = 0
    for (let start = yesterdaysTimestamp; start > timestampNd; start -= ONE_DAY_IN_SECONDS) {
        let dex2SubstractVolumes: any = {}
        for (const dex of dexs) {
            if (dex2Substract) {
                dex2SubstractVolumes['totalVolume'] = dex2Substract.recordsMap?.[String(start)]?.data
            }
            const yesterdaysVolume = dex.recordsMap?.[String(start)]?.data
            yesterdaysVolumeAll += yesterdaysVolume ? sumAllVolumes(yesterdaysVolume) - sumAllVolumes(dex2SubstractVolumes['totalVolume']) : 0
        }
    }

    const endNdTimestamps = timestampNd - (nDaysChange * ONE_DAY_IN_SECONDS)
    let ndVolume = 0
    for (let start = timestampNd; start > endNdTimestamps; start -= ONE_DAY_IN_SECONDS) {
        let dex2SubstractVolumes: any = {}
        for (const dex of dexs) {
            if (dex2Substract) {
                dex2SubstractVolumes['totalVolume'] = dex2Substract.recordsMap?.[String(start)]?.data
            }
            const yesterdaysVolume = dex.recordsMap?.[String(start)]?.data
            ndVolume += yesterdaysVolume ? sumAllVolumes(yesterdaysVolume) - sumAllVolumes(dex2SubstractVolumes['totalVolume']) : 0
        }
    }


    const ndChange = yesterdaysVolumeAll && ndVolume ? (yesterdaysVolumeAll - ndVolume) / ndVolume * 100 : null
    return {
        change_NdoverNd: formatNdChangeNumber(ndChange),
        totalNd: yesterdaysVolumeAll
    }
}

export const getWoWStats = (
    dexs: Pick<ProtocolAdaptorSummary, 'recordsMap'>[],
    dex2Substract?: ProtocolAdaptorSummary,
    baseTimestamp: number = (Date.now() / 1000) - ONE_DAY_IN_SECONDS
) => {
    const wow = calcNdONdChange(dexs, dex2Substract, baseTimestamp, 7)
    const wow14 = calcNdONdChange(dexs, dex2Substract, baseTimestamp, 14)
    const mom = calcNdONdChange(dexs, dex2Substract, baseTimestamp, 30)
    const mom60 = calcNdONdChange(dexs, dex2Substract, baseTimestamp, 60)
    return {
        change_7dover7d: wow.change_NdoverNd ?? 0,
        total7d: wow.totalNd,
        change_30dover30d: mom.change_NdoverNd ?? 0,
        total30d: mom.totalNd,
        total14dto7d: wow14.totalNd - wow.totalNd,
        total60dto30d: mom60.totalNd - mom.totalNd
    }
}

const getSumAllDexsToday = (
    dexs: ProtocolAdaptorSummary[],
    dex2Substract?: ProtocolAdaptorSummary,
    baseTimestamp: number = (Date.now() / 1000) - ONE_DAY_IN_SECONDS,
    extraTypes?: (keyof ExtraTypes)[],
): IGeneralStats => {
    const yesterdaysTimestamp = getTimestampAtStartOfDayUTC(baseTimestamp);
    const timestamp1d = yesterdaysTimestamp - ONE_DAY_IN_SECONDS * 1
    const timestamp7d = yesterdaysTimestamp - ONE_DAY_IN_SECONDS * 7
    const timestamp30d = yesterdaysTimestamp - ONE_DAY_IN_SECONDS * 30
    let totalVolume = 0
    let totalVolume1d = 0
    let totalVolume7d = 0
    let totalVolume30d = 0
    let dex2SubstractVolumes: any = {}
    const extraTypesObj = {} as IJSON<number>
    for (const dex of dexs) {
        extraTypes?.forEach(extraType => {
            if (extraTypesObj[extraType]) {
                extraTypesObj[extraType] += dex[extraType] ?? 0
            } else {
                extraTypesObj[extraType] = dex[extraType] ?? 0
            }
        })
        if (dex2Substract) {
            dex2SubstractVolumes['totalVolume'] = dex2Substract.recordsMap?.[String(yesterdaysTimestamp)]?.data
            dex2SubstractVolumes['totalVolume1d'] = dex2Substract.recordsMap?.[String(timestamp1d)]?.data
            dex2SubstractVolumes['totalVolume7d'] = dex2Substract.recordsMap?.[String(timestamp7d)]?.data
            dex2SubstractVolumes['totalVolume30d'] = dex2Substract.recordsMap?.[String(timestamp30d)]?.data
        }
        const yesterdaysVolume = dex.recordsMap?.[String(yesterdaysTimestamp)]?.data
        const volume1d = dex.recordsMap?.[String(timestamp1d)]?.data
        const volume7d = dex.recordsMap?.[String(timestamp7d)]?.data
        const volume30d = dex.recordsMap?.[String(timestamp30d)]?.data
        totalVolume += yesterdaysVolume ? sumAllVolumes(yesterdaysVolume) - sumAllVolumes(dex2SubstractVolumes['totalVolume']) : 0
        totalVolume1d += volume1d ? sumAllVolumes(volume1d) - sumAllVolumes(dex2SubstractVolumes['totalVolume1d']) : 0
        totalVolume7d += volume7d ? sumAllVolumes(volume7d) - sumAllVolumes(dex2SubstractVolumes['totalVolume7d']) : 0
        totalVolume30d += volume30d ? sumAllVolumes(volume30d) - sumAllVolumes(dex2SubstractVolumes['totalVolume30d']) : 0
    }
    return {
        ...extraTypesObj,
        total24h: totalVolume,
        change_1d: formatNdChangeNumber(((totalVolume - totalVolume1d) / totalVolume1d) * 100) ?? 0,
        change_7d: formatNdChangeNumber(((totalVolume - totalVolume7d) / totalVolume7d) * 100) ?? 0,
        change_1m: formatNdChangeNumber(((totalVolume - totalVolume30d) / totalVolume30d) * 100) ?? 0,
        ...getWoWStats(dexs, dex2Substract, baseTimestamp),
        breakdown24h: null
    }
}

export type IChartData = [string, number][] // [timestamp, volume]
export type IChartDataBreakdown = Array<[number, { [protocol: string]: number | IJSON<number> }]>

const generateAggregatedVolumesChartData = (protocols: ProtocolAdaptorSummary[]): IChartData => {
    const chartData: IChartData = []
    const dataPoints = getDataPoints()
    for (const dataPoint of dataPoints) {
        let total = 0
        for (const protocol of protocols) {
            const volumeObj = protocol.recordsMap?.[String(dataPoint)]?.data
            total += volumeObj ? sumAllVolumes(volumeObj) : 0
        }
        chartData.push([`${dataPoint}`, total])
    }
    return chartData
}

export type IChartDataByDex = Array<[string, {
    [dex: string]: number
}]> // [timestamp, {chain: volume}]

const generateByDexVolumesChartData = (protocols: ProtocolAdaptorSummary[]): IChartDataByDex => {
    const chartData: IChartDataByDex = []
    const dataPoints = getDataPoints()
    for (const dataPoint of dataPoints) {
        const dayBreakDown: IChartDataByDex[0][1] = {}
        for (const protocol of protocols) {
            const volumeObj = protocol.recordsMap?.[String(dataPoint)]?.data
            if (volumeObj)
                dayBreakDown[protocol.module] = sumAllVolumes(volumeObj)
        }
        chartData.push([`${dataPoint}`, dayBreakDown])
    }
    return chartData
}

/* export const calcNdONdChange = (volumes: IJSON<AdaptorRecord>, nDaysChange: number, baseTimestamp?: number) => {
    const yesterdaysTimestamp = getTimestampAtStartOfDayUTC(baseTimestamp ?? ((Date.now() / 1000) - ONE_DAY_IN_SECONDS));

    const timestampNd = yesterdaysTimestamp - (nDaysChange * ONE_DAY_IN_SECONDS)

    let yesterdaysVolume = 0
    for (let start = yesterdaysTimestamp; start > timestampNd; start -= ONE_DAY_IN_SECONDS) {
        yesterdaysVolume += sumAllVolumes(volumes?.[String(start)]?.data ?? {})
    }
    const endNdTimestamps = timestampNd + (nDaysChange * ONE_DAY_IN_SECONDS)
    let ndVolume = 0
    for (let start = timestampNd; start > timestampNd + endNdTimestamps; start -= ONE_DAY_IN_SECONDS) {
        ndVolume += sumAllVolumes(volumes?.[String(start)]?.data ?? {})
    }

    const ndChange = yesterdaysVolume && ndVolume ? (yesterdaysVolume - ndVolume) / ndVolume * 100 : null
    console.log("yesterdaysTimestamp", yesterdaysTimestamp, "timestampNd", timestampNd)
    console.log("yesterdaysVolume", yesterdaysVolume, "ndVolume", ndVolume)
    console.log("ndChange", ndChange)
    return formatNdChangeNumber(ndChange)
} */


const calcNdChange = (volumes: IJSON<AdaptorRecord>, nDaysChange: number, baseTimestamp?: number, extend?: boolean) => {
    let totalVolume: number | null = 0
    let totalVolumeNd: number | null = 0
    let yesterdaysTimestamp = getTimestampAtStartOfDayUTC(baseTimestamp ?? ((Date.now() / 1000) - ONE_DAY_IN_SECONDS));
    let yesterdaysVolume = volumes?.[String(yesterdaysTimestamp)]?.data
    if (extend) {
        if (!yesterdaysVolume)
            for (let i = 1; i <= 3; i++) {
                yesterdaysTimestamp = yesterdaysTimestamp - (i * ONE_DAY_IN_SECONDS)
                yesterdaysVolume = volumes?.[String(yesterdaysTimestamp)]?.data
                if (yesterdaysVolume) break
            }
    }
    const timestampNd = yesterdaysTimestamp - (nDaysChange * ONE_DAY_IN_SECONDS)
    let volumeNd = volumes?.[String(timestampNd)]?.data
    if (extend) {
        if (!volumeNd)
            for (let i = 1; i <= 3; i++) {
                volumeNd = volumes?.[String(timestampNd - (i * ONE_DAY_IN_SECONDS))]?.data
                if (volumeNd) break
            }
    }
    totalVolume = yesterdaysVolume ? totalVolume + sumAllVolumes(yesterdaysVolume) : null
    totalVolumeNd = volumeNd ? totalVolumeNd + sumAllVolumes(volumeNd) : null
    const ndChange = totalVolume && totalVolumeNd ? (totalVolume - totalVolumeNd) / totalVolumeNd * 100 : null
    return formatNdChangeNumber(ndChange)
}

const formatNdChangeNumber = (number: number | null) => {
    if (number === Number.POSITIVE_INFINITY || number === Number.NEGATIVE_INFINITY || Number.isNaN(number) || number === null)
        return null
    return Math.round((number + Number.EPSILON) * 100) / 100
}

export {
    sumAllVolumes,
    getSumAllDexsToday,
    generateAggregatedVolumesChartData,
    generateByDexVolumesChartData,
    calcNdChange
}