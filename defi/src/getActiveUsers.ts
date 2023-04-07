import { cache20MinResponse, wrap, IResponse } from "./utils/shared";
import { getLatestUsersData } from "./users/storeUsers";
import { getCurrentUnixTimestamp } from "./utils/date";

const handler = async (): Promise<IResponse> => {
    const latestRecords = await getLatestUsersData(getCurrentUnixTimestamp()-8*3600, "all") // -8h
    const latestRecordByProtocol = {} as {
        [protocol:string]: {users:number, end:number}
    }
    latestRecords.forEach(record=>{
        if(latestRecordByProtocol[record.protocolid] === undefined || latestRecordByProtocol[record.protocolid].end < record.endtime){
            latestRecordByProtocol[record.protocolid] = {users:record.users, end:record.endtime}
        }
    })
    return cache20MinResponse(latestRecordByProtocol)
}

export default wrap(handler);