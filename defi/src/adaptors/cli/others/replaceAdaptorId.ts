import "../setup.ts"
import { removeAdaptorRecord, AdaptorRecordType, getAdaptorRecord, storeAdaptorRecord } from "../../db-utils/adaptor-record"
import { ProtocolType } from "@defillama/dimension-adapters/adapters/types"


(async () => {
    const eventTimestamp = Math.trunc(Date.now()/1000)
    const currentID = "506"
    const newID = "2203"
    const ok = await Promise.all(Object.values(AdaptorRecordType).map(async (recordType)=>{
        const dailyRecords = await getAdaptorRecord(currentID, recordType, ProtocolType.PROTOCOL)
        if (!(dailyRecords instanceof Array)) throw new Error("Wrong query")
        for (const record of dailyRecords) {
            record.adaptorId = newID
            await storeAdaptorRecord(record, eventTimestamp)
        }
        await removeAdaptorRecord(currentID, recordType, ProtocolType.PROTOCOL)
    }))
    console.log(ok)
})()
