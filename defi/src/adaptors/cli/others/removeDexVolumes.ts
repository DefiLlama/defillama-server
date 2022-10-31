import "./../setup.ts"
import { removeAdaptorRecord, AdaptorRecordType } from "../../db-utils/adaptor-record"

(async () => {
    console.log("Removing...")
    const ok = await removeAdaptorRecord("", AdaptorRecordType.dailyFees)
    const ok2 = await removeAdaptorRecord("", AdaptorRecordType.dailyRevenue)
    console.log(ok, ok2)
})()
