import "./setup.ts"
import { handler } from "../handlers/storeAdaptorData";
import { AdapterType } from "@defillama/adaptors/adapters/types";
import fees from "../data/fees";

handler({
    protocolIndexes: [fees?.findIndex(v=>v.name==='Bitcoin')],
    timestamp:1665878400,
    adaptorType: AdapterType.FEES
})