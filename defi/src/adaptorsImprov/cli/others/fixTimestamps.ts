import "../setup.ts"
import { removeAdaptorRecord, AdaptorRecordType, getAdaptorRecord, storeAdaptorRecord, AdaptorRecord, removeAdaptorRecordQuery } from "../../db-utils/adaptor-record"
import { ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import getDataPoints from "../../utils/getDataPoints"
import { IJSON } from "../../data/types"

(async () => {
    const dataPts = getDataPoints(1605139200000)
    const dailyRecords = await getAdaptorRecord("1052", AdaptorRecordType.dailyVolume, ProtocolType.PROTOCOL)
    if (!(dailyRecords instanceof Array)) throw new Error("Wrong query")
    const ok: number[] = []
    const notOk: number[] = []
    const notAdded: number[] = []
    const notAdded2hours: number[] = []
    const toRemove1h: number[] = []
    const toRemove2h: number[] = []
    const toAdd2h: number[] = []
    const toAdd1h: number[] = []
    const notAdded1hExtra: number[] = []
    const toAdd1hExtra: number[] = []
    const toRemove1hExtra: number[] = []
    const recordsMap = dailyRecords.reduce((acc, curr) => ({ ...acc, [String(curr.timestamp)]: curr }), {} as IJSON<AdaptorRecord>)
    for (const record of dailyRecords) {
        // console.log("Storing", record)
        // await storeAdaptorRecord(new AdaptorRecord(record.type, record.adaptorId, record.timestamp+60*60, record.data, record.protocolType), Math.trunc(Date.now() / 1000))
        if (dataPts.includes(record.timestamp)) {
            ok.push(record.timestamp)
        }
        else if (dataPts.includes(record.timestamp + 60 * 60)) {
            notAdded.push(record.timestamp)
        }
        else if (dataPts.includes(record.timestamp + 60 * 60 * 2)) {
            notAdded2hours.push(record.timestamp)
        }
        else if (dataPts.includes(record.timestamp - 60 * 60))
            notAdded1hExtra.push(record.timestamp)
        else notOk.push(record.timestamp)

    }
    for (const out of notAdded) {
        if (ok.includes(out + 60 * 60))
            toRemove1h.push(out)
        else toAdd1h.push(out)
    }
    for (const out of notAdded2hours) {
        if (!ok.includes(out + 60 * 60 * 2))
            toAdd2h.push(out)
        else toRemove2h.push(out)
    }
    for (const out of notAdded1hExtra) {
        if (!ok.includes(out - 60 * 60))
            toAdd1hExtra.push(out)
        else toRemove1hExtra.push(out)
    }
    console.log("ok", ok.length)
    console.log("to add 1h", toAdd1h.length, toAdd1h)
    console.log("to remove 1h", toRemove1h.length)
    console.log("to add 2h", toAdd2h.length, toAdd2h)
    console.log("to remove 2h", toRemove2h.length)
    console.log("to add 1hExtra", toAdd1hExtra.length)
    console.log("to remove 1hExtra", toRemove1hExtra.length)
    console.log("no category", notOk)

/*     for (const record2Add of toAdd1h) {
        const rec = recordsMap[String(record2Add)]
        console.log("Adding", rec.keys())
        await storeAdaptorRecord(new AdaptorRecord(rec.type, rec.adaptorId, rec.timestamp+60*60, rec.data, rec.protocolType), Math.trunc(Date.now() / 1000))
        // await removeAdaptorRecordQuery(recordsMap[String(record2Add)])
    }
    for (const record2Add of toAdd2h) {
        const rec = recordsMap[String(record2Add)]
        console.log("Adding", rec.keys())
        await storeAdaptorRecord(new AdaptorRecord(rec.type, rec.adaptorId, rec.timestamp+60*60*2, rec.data, rec.protocolType), Math.trunc(Date.now() / 1000))
        // await removeAdaptorRecordQuery(recordsMap[String(record2Add)])
    } */

    /* for (const record2Add of toRemove1h) {
        const rec = recordsMap[String(record2Add)]
        console.log("Removing", rec)
        // await storeAdaptorRecord(new AdaptorRecord(rec.type, rec.adaptorId, rec.timestamp, rec.data, rec.protocolType), Math.trunc(Date.now() / 1000))
        await removeAdaptorRecordQuery(recordsMap[String(record2Add)])
    }
    for (const record2Add of toRemove2h) {
        const rec = recordsMap[String(record2Add)]
        console.log("Removing", rec)
        // await storeAdaptorRecord(new AdaptorRecord(rec.type, rec.adaptorId, rec.timestamp, rec.data, rec.protocolType), Math.trunc(Date.now() / 1000))
        await removeAdaptorRecordQuery(recordsMap[String(record2Add)])
    }
    for (const record2Add of toRemove1hExtra) {
        const rec = recordsMap[String(record2Add)]
        console.log("Removing", rec)
        // await storeAdaptorRecord(new AdaptorRecord(rec.type, rec.adaptorId, rec.timestamp, rec.data, rec.protocolType), Math.trunc(Date.now() / 1000))
        await removeAdaptorRecordQuery(recordsMap[String(record2Add)])
    } */
})()
