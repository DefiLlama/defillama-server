import "./setup.ts"
import { handler } from "../handlers/storeDexVolume";

handler({
    protocolIndexes: [19]
})