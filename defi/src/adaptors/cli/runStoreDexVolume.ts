import "./setup.ts"
import { handler } from "../handlers/storeAdaptorData";
import { AdapterType } from "@defillama/adaptors/adapters/types";
import dexs from "../data/dexs";

handler({
    protocolIndexes: [dexs?.findIndex(v=>v.name==='Uniswap')],
    timestamp:1665878400,
    adaptorType: AdapterType.DEXS
})