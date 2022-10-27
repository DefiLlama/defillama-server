import { getTimestampAtStartOfDayUTC } from "../../utils/date";
import { Volume } from "../data/volume";
import { VolumeSummaryDex } from "../handlers/getDexs";
import { ONE_DAY_IN_SECONDS } from "../handlers/getDexVolume";
import { IRecordVolumeData } from "../handlers/storeDexVolume";
import getDataPoints from "./getDataPoints";

const sumAllVolumes = (breakdownVolumes: IRecordVolumeData, protVersion?: string) =>
    breakdownVolumes
        ? Object.values(breakdownVolumes).reduce((acc, volume) =>
            acc + Object.entries(volume).filter(([protV, _]) => protVersion ? protV === protVersion : true).reduce<number>((vacc, [_key, current]) => typeof current === 'number' ? vacc + current : vacc, 0)
            , 0)
        : 0

export interface IGeneralStats {
    totalVolume: number;
    changeVolume1d: number | null;
    changeVolume7d: number | null;
    changeVolume30d: number | null;
}

const getSumAllDexsToday = (dexs: VolumeSummaryDex[], dex2Substract?: VolumeSummaryDex, baseTimestamp: number = (Date.now() / 1000) - ONE_DAY_IN_SECONDS): IGeneralStats => {
    const yesterdaysTimestamp = getTimestampAtStartOfDayUTC(baseTimestamp);
    const timestamp1d = yesterdaysTimestamp - ONE_DAY_IN_SECONDS * 1  // (new Date(yesterdaysTimestamp * 1000)).setDate((new Date(yesterdaysTimestamp * 1000).getDate() - 1)) / 1000
    const timestamp7d = yesterdaysTimestamp - ONE_DAY_IN_SECONDS * 7  // (new Date(yesterdaysTimestamp * 1000)).setDate((new Date(yesterdaysTimestamp * 1000).getDate() - 7)) / 1000
    const timestamp30d = yesterdaysTimestamp - ONE_DAY_IN_SECONDS * 30  // (new Date(yesterdaysTimestamp * 1000)).setDate((new Date(yesterdaysTimestamp * 1000).getDate() - 30)) / 1000
    let totalVolume = 0
    let totalVolume1d = 0
    let totalVolume7d = 0
    let totalVolume30d = 0
    let dex2SubstractVolumes: any = {}
    for (const dex of dexs) {
        if (dex2Substract) {
            dex2SubstractVolumes['totalVolume'] = dex2Substract.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === yesterdaysTimestamp)?.data
            dex2SubstractVolumes['totalVolume1d'] = dex2Substract.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp1d)?.data
            dex2SubstractVolumes['totalVolume7d'] = dex2Substract.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp7d)?.data
            dex2SubstractVolumes['totalVolume30d'] = dex2Substract.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp30d)?.data
        }
        const yesterdaysVolume = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === yesterdaysTimestamp)?.data
        const volume1d = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp1d)?.data
        const volume7d = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp7d)?.data
        const volume30d = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp30d)?.data
        totalVolume += yesterdaysVolume ? sumAllVolumes(yesterdaysVolume) - sumAllVolumes(dex2SubstractVolumes['totalVolume']) : 0
        totalVolume1d += volume1d ? sumAllVolumes(volume1d) - sumAllVolumes(dex2SubstractVolumes['totalVolume1d']) : 0
        totalVolume7d += volume7d ? sumAllVolumes(volume7d) - sumAllVolumes(dex2SubstractVolumes['totalVolume7d']) : 0
        totalVolume30d += volume30d ? sumAllVolumes(volume30d) - sumAllVolumes(dex2SubstractVolumes['totalVolume30d']) : 0
    }
    return {
        totalVolume,
        changeVolume1d: formatNdChangeNumber(((totalVolume - totalVolume1d) / totalVolume1d) * 100),
        changeVolume7d: formatNdChangeNumber(((totalVolume - totalVolume7d) / totalVolume7d) * 100),
        changeVolume30d: formatNdChangeNumber(((totalVolume - totalVolume30d) / totalVolume30d) * 100),
    }
}

export type IChartData = [string, number][] // [timestamp, volume]

const generateAggregatedVolumesChartData = (dexs: VolumeSummaryDex[]): IChartData => {
    // @ts-ignore
    const chartData: IChartData = []
    const dataPoints = getDataPoints()
    for (const dataPoint of dataPoints) {
        let total = 0
        for (const dex of dexs) {
            const volumeObj = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === dataPoint)?.data
            total += volumeObj ? sumAllVolumes(volumeObj) : 0
        }
        chartData.push([`${dataPoint}`, total])
    }
    return chartData
}

export type IChartDataByDex = Array<[string, {
    [dex: string]: number
}]> // [timestamp, {chain: volume}]

const generateByDexVolumesChartData = (dexs: VolumeSummaryDex[]): IChartDataByDex => {
    // @ts-ignore
    const chartData: IChartDataByDex = []
    const dataPoints = getDataPoints()
    for (const dataPoint of dataPoints) {
        const dayBreakDown: IChartDataByDex[0][1] = {}
        for (const dex of dexs) {
            const volumeObj = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === dataPoint)?.data
            if (volumeObj)
                dayBreakDown[dex.volumeAdapter] = sumAllVolumes(volumeObj)
        }
        chartData.push([`${dataPoint}`, dayBreakDown])
    }
    return chartData
}

const calcNdChange = (volumes: Volume[], nDaysChange: number, baseTimestamp?: number) => {
    let totalVolume: number | null = 0
    let totalVolumeNd: number | null = 0
    let yesterdaysTimestamp = getTimestampAtStartOfDayUTC(baseTimestamp ?? ((Date.now() / 1000) - ONE_DAY_IN_SECONDS));
    let yesterdaysVolume = volumes.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === yesterdaysTimestamp)?.data

    if (!yesterdaysVolume)
        for (let i = 1; i <= 5; i++) {
            yesterdaysTimestamp = yesterdaysTimestamp - (i * ONE_DAY_IN_SECONDS)
            yesterdaysVolume = volumes.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === yesterdaysTimestamp)?.data
            if (yesterdaysVolume) break
        }

    const timestampNd = yesterdaysTimestamp - (nDaysChange * ONE_DAY_IN_SECONDS)
    let volumeNd = volumes.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestampNd)?.data

    if (!volumeNd)
        for (let i = 1; i <= 5; i++) {
            volumeNd = volumes.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestampNd - (i * ONE_DAY_IN_SECONDS))?.data
            if (volumeNd) break
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

export const getSummaryByProtocolVersion = (volumes: Volume[], prevDayTimestamp: number) => {
    const prevDayVolume = volumes.find(vol => vol.timestamp === prevDayTimestamp)
    const raw = volumes.reduce((accVols, volume) => {
        Object.entries(volume.data).forEach(([chain, protocolsData]) => {
            const protocolNames = Object.keys(protocolsData)
            if (protocolNames.length <= 1) return
            for (const protocolName of protocolNames) {
                if (accVols[protocolName]) {
                    accVols[protocolName].push(new Volume(volume.type, volume.dexId, volume.timestamp, {
                        [chain]: {
                            [protocolName]: protocolsData[protocolName]
                        }
                    }))
                }
                else {
                    accVols[protocolName] = [(new Volume(volume.type, volume.dexId, volume.timestamp, {
                        [chain]: {
                            [protocolName]: protocolsData[protocolName]
                        }
                    }))]
                }
            }
        })
        return accVols
    }, {} as { [protocol: string]: Volume[] })
    delete raw['error']
    const summaryByProtocols = Object.entries(raw).reduce((acc, [protVersion, protVolumes]) => {
        acc[protVersion] = {
            totalVolume24h: prevDayVolume ? sumAllVolumes(prevDayVolume.data, protVersion) : 0,
            change_1d: calcNdChange(protVolumes, 1),
            change_7d: calcNdChange(protVolumes, 7),
            change_1m: calcNdChange(protVolumes, 30),
        }
        return acc
    }, {} as {
        // TODO: improve types
        [protV: string]: {
            totalVolume24h: number | null
            change_1d: number | null
            change_7d: number | null
            change_1m: number | null
        }
    })
    return Object.keys(summaryByProtocols).length >= 1 ? summaryByProtocols : null
}

export {
    sumAllVolumes,
    getSumAllDexsToday,
    generateAggregatedVolumesChartData,
    generateByDexVolumesChartData,
    calcNdChange
}