import "../setup.ts"
import { getAdaptorRecord, AdaptorRecordType, AdaptorRecord } from "../../db-utils/adaptor-record"
import loadAdaptorsData from "../../data"
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { IJSON, ProtocolAdaptor } from "../../data/types"
import generateCleanRecords from "../../handlers/helpers/generateCleanRecords"
import getDataPoints from "../../utils/getDataPoints"
import { sumAllVolumes } from "../../utils/volumeCalcs"
import path from "path"
import { ensureDirectoryExistence } from "../backfillUtilities/getBackfillEvent"
import { writeFileSync } from "fs"


const json2CSV = (headers: any[], map: IJSON<AdaptorRecord>, name: string) => {
    const replacer = (_key: string, value: any) => !value ? '' : value // specify how you want to handle null values here
    const header = headers
    const csv = header.map(fieldName => {
        let accessor = fieldName
        if (accessor === 'Protocol') return JSON.stringify(name, replacer)
        const value = sumAllVolumes(map[accessor]?.data ?? {})
        return JSON.stringify(value, replacer)
    }).join(',')
    return csv
}

(async () => {
    const adapters2load: string[] = ["dexs", "protocols"]
    const protocolsList = Object.keys((await loadAdaptorsData("dexs" as AdapterType)).config)
    const adaptersList: ProtocolAdaptor[] = []
    for (const type2load of adapters2load) {
        try {
            const adaptorsData = await loadAdaptorsData(type2load as AdapterType)
            adaptorsData.default.forEach(va => {
                if (va.config?.enabled)
                    if (protocolsList.includes(va.module)) adaptersList.push(va)
                return
            })
        } catch (error) {
            console.error(error)
        }
    }

    const headers = ["Protocol", ...getDataPoints(Date.UTC(2022, 9, 1)).map(u => u.toString())]
    const csv = []

    for (const adaptor of adaptersList) {
        const rawData = await getAdaptorRecord(adaptor.id, AdaptorRecordType.dailyVolume, adaptor.protocolType, "ALL").catch(console.error)
        if (!(rawData instanceof Array)) continue
        const data = await generateCleanRecords(
            rawData,
            adaptor.chains,
            adaptor.versionKey ? [adaptor.versionKey]: [adaptor.module]
        )

        const csvLine = json2CSV(headers, data.cleanRecordsMap, adaptor.displayName)
        csv.push(csvLine)
    }

    const eventFileLocation = path.resolve(__dirname, "output", `dexs_volume_from_oct.csv`);
    ensureDirectoryExistence(eventFileLocation)
    writeFileSync(eventFileLocation, [
        headers.join(','),
        ...csv
    ].join('\r\n')
    )
})()

