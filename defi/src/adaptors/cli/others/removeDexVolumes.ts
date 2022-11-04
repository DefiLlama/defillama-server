import "./../setup.ts"
import { removeAdaptorRecord, AdaptorRecordType } from "../../db-utils/adaptor-record"
import { ProtocolType } from "@defillama/adaptors/adapters/types"

(async () => {
    console.log("Removing...")
    const ok = await removeAdaptorRecord("", AdaptorRecordType.dailyVolume, ProtocolType.PROTOCOL)
    const ok2 = await removeAdaptorRecord("", AdaptorRecordType.totalVolume, ProtocolType.PROTOCOL)
    console.log(ok, ok2)
})()
