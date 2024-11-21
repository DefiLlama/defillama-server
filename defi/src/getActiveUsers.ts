import { cache20MinResponse, wrap, IResponse } from "./utils/shared";
import { getLatestUsersData } from "./users/storeUsers";
import { getCurrentUnixTimestamp } from "./utils/date";
import protocols from "./protocols/data";
import parentProtocols from "./protocols/parentProtocols";

type userTypes = "users" | "newUsers" | "txs" | "gasUsd"

export const getActiveUsers = async () => {
    const latestRecords = await Promise.all((["users", "newUsers", "txs", "gasUsd"] as (userTypes)[])
        .map(type => getLatestUsersData(type, getCurrentUnixTimestamp() - 8 * 3600).then(rows => ({type, rows})))) // -8h
    const latestRecordByProtocol = {} as {
        [protocol: string]: {
            [type:string]: {value: number, end: number}
        }
    }
    const allProtocols = protocols.concat(parentProtocols as any).reduce((acc, item)=>({
        ...acc,
        [item.id]: item.name
    }), {} as any)
    latestRecords.forEach(({type, rows}) => {
        rows.forEach(record => {
            if(latestRecordByProtocol[record.protocolid] === undefined){
                latestRecordByProtocol[record.protocolid] = {
                    name: allProtocols[record.protocolid]
                }
            }
            if (latestRecordByProtocol[record.protocolid][type] === undefined || latestRecordByProtocol[record.protocolid][type].end < record.endtime) {
                latestRecordByProtocol[record.protocolid][type] = { value: record[type === "newUsers" || type==="users"?"users":"sum"], end: record.endtime }
            }
        })
    })
    return latestRecordByProtocol
}

async function handler(): Promise<IResponse> {
    return cache20MinResponse(await getActiveUsers())
}

export default wrap(handler);