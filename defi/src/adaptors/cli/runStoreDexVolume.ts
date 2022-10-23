import "./setup.ts"
import { handler } from "../handlers/storeAdaptorData";
import { AdapterType } from "@defillama/adaptors/adapters/types";
import incentives from "../data/incentives";

handler({
    protocolIndexes: [incentives?.findIndex(v=>v.name==='Bitcoin')],
    timestamp:1665878400,
    adaptorType: AdapterType.INCENTIVES
})