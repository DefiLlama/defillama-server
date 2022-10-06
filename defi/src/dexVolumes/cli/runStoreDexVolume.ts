import "./setup.ts"
import { handler } from "../handlers/storeDexVolume";
import volumeAdapters from "../dexAdapters";

handler({
    protocolIndexes: [volumeAdapters.findIndex(va => va.id==='116')],
    timestamp:1663459200
})