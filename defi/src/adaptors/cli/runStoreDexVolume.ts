import "./setup.ts"
import { handler } from "../handlers/storeAdaptorData";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
// import dexs from "../data/dexs";

handler({
    protocolIndexes: [0],
    timestamp: 1670112000,
    adaptorType: AdapterType.FEES
})