import "./setup.ts"
import { handler } from "../handlers/storeDexVolume";
import volumeAdapters from "../dexAdapters";

handler({
    protocolIndexes: [17],
})