import "./setup.ts"
import { handler } from "../handlers/storeDexVolume";
import volumeAdapters from "../dexAdapters";

handler({
    protocolIndexes: [volumeAdapters.findIndex(va => va.id==='162')],
    timestamp: 1639526400
})