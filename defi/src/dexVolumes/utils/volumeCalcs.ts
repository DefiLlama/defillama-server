import { getTimestampAtStartOfDayUTC } from "../../utils/date";
import { Volume } from "../data/volume";
import { VolumeSummaryDex } from "../handlers/getDexs";
import { IRecordVolumeData } from "../handlers/storeDexVolume";
import getDataPoints from "./getDataPoints";

const summAllVolumes = (breakdownVolumes: IRecordVolumeData) =>
    Object.values(breakdownVolumes).reduce((acc, volume) =>
        acc + Object.values(volume)
            .reduce<number>((vacc, current) => typeof current === 'number' ? vacc + current : vacc, 0)
        , 0)

const getSumAllDexsToday = (dexs: VolumeSummaryDex[]) => {
    const todaysTimestamp = getTimestampAtStartOfDayUTC(Date.now() / 1000);
    const timestamp1d = (new Date(todaysTimestamp * 1000)).setDate((new Date(todaysTimestamp * 1000).getDate() - 1)) / 1000
    const timestamp7d = (new Date(todaysTimestamp * 1000)).setDate((new Date(todaysTimestamp * 1000).getDate() - 7)) / 1000
    const timestamp30d = (new Date(todaysTimestamp * 1000)).setDate((new Date(todaysTimestamp * 1000).getDate() - 30)) / 1000
    let totalVolume = 0
    let totalVolume1d = 0
    let totalVolume7d = 0
    let totalVolume30d = 0
    for (const dex of dexs) {
        const todaysVolume = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === todaysTimestamp)?.data
        const volume1d = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp1d)?.data
        const volume7d = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp7d)?.data
        const volume30d = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp30d)?.data
        totalVolume += todaysVolume ? summAllVolumes(todaysVolume) : 0
        totalVolume1d += volume1d ? summAllVolumes(volume1d) : 0
        totalVolume7d += volume7d ? summAllVolumes(volume7d) : 0
        totalVolume30d += volume30d ? summAllVolumes(volume30d) : 0
    }
    return {
        totalVolume,
        changeVolume1d: formatNdChangeNumber(((totalVolume - totalVolume1d) / totalVolume1d) * 100),
        changeVolume7d: formatNdChangeNumber(((totalVolume - totalVolume7d) / totalVolume7d) * 100),
        changeVolume30d: formatNdChangeNumber(((totalVolume - totalVolume30d) / totalVolume30d) * 100),
    }
}

const generateAggregatedVolumesChartData = (dexs: VolumeSummaryDex[]) => {
    const chartData: [[string, number]] = [["0", 0]]
    const dataPoints = getDataPoints()
    for (const dataPoint of dataPoints) {
        let total = 0
        for (const dex of dexs) {
            const volumeObj = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === dataPoint)?.data
            total += volumeObj ? summAllVolumes(volumeObj) : 0
        }
        chartData.push([`${dataPoint}`, total])
    }
    chartData.shift()
    return chartData
}

const calcNdChange = (volumes: Volume[], nDaysChange: number) => {
    let totalVolume = 0
    let totalVolumeNd = 0
    const todaysTimestamp = getTimestampAtStartOfDayUTC((Date.now() - 1000 * 60 * 60 * 24) / 1000);
    const timestamp1d = (new Date(todaysTimestamp * 1000)).setDate((new Date(todaysTimestamp * 1000).getDate() - nDaysChange)) / 1000
    const todaysVolume = volumes.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === todaysTimestamp)?.data
    const volumeNd = volumes.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp1d)?.data
    totalVolume += todaysVolume ? summAllVolumes(todaysVolume) : 0
    totalVolumeNd += volumeNd ? summAllVolumes(volumeNd) : 0
    return formatNdChangeNumber((totalVolume - totalVolumeNd) / totalVolumeNd * 100)
}

const formatNdChangeNumber = (number: number) => {
    if (number === Number.POSITIVE_INFINITY)
        number = 100
    if (number === Number.NEGATIVE_INFINITY)
        number = -100
    return Math.round((number + Number.EPSILON) * 100) / 100
}

export {
    summAllVolumes,
    getSumAllDexsToday,
    generateAggregatedVolumesChartData,
    calcNdChange
}