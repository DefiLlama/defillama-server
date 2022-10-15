import "./setup.ts"
import { handler } from "../handlers/storeAdaptorData";
import { AdapterType } from "@defillama/adaptors/adapters/types";
import volumes from "../data/volumes";

handler({
    protocolIndexes: [volumes?.findIndex(v=>v.name==='Uniswap')] ?? [2],
    timestamp:1541203200,
    adaptorType: AdapterType.VOLUME
})