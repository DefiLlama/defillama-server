import "./../setup.ts"
import { removeAdaptorRecord, AdaptorRecordType } from "../../db-utils/adaptor-record"
import { ProtocolType } from "@defillama/dimension-adapters/adapters/types"

(async () => {
    console.log("Removing...")
    const ok = await Promise.all([
        await removeAdaptorRecord("146", AdaptorRecordType.dailyFees, ProtocolType.PROTOCOL),
        await removeAdaptorRecord("146", AdaptorRecordType.dailyRevenue, ProtocolType.PROTOCOL),
        await removeAdaptorRecord("146", AdaptorRecordType.totalFees, ProtocolType.PROTOCOL),
        await removeAdaptorRecord("146", AdaptorRecordType.totalRevenue, ProtocolType.PROTOCOL)
    ])
    console.log(ok)
})()
