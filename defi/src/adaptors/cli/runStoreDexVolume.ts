import "./setup.ts"
import { handler } from "../handlers/storeAdaptorData";
import { AdapterType } from "@defillama/adaptors/adapters/types";
import protocols from "../data/protocols";

handler({
    protocolIndexes: [protocols?.findIndex(v=>v.name==='Uniswap')],
    timestamp:1665878400,
    adaptorType: AdapterType.PROTOCOLS
})