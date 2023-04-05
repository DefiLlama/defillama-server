import "./setup.ts"
import { handler } from "../handlers/storeAdaptorData";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
// import dexs from "../data/dexs";

handler({
    protocolModules: ["paraswap"],
    timestamp: 1680134400+60*60*24,
    adaptorType: AdapterType.FEES
})