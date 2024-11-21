import "./setup.ts"
import { handler } from "../handlers/triggerStoreAdaptorData";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
// import volumeAdapters from "../dexAdapters";
handler({type: AdapterType.DEXS})