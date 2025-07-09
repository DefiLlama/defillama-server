import { Protocol } from "../../protocols/types";
// import adapters from "./adapters"
import adaptersData from "./tvlAdapterData.json"
import { getModule } from "@defillama/adapters/adapters"
import { unMockFunctions } from "@defillama/adapters/modules/util"


/**
 * 
 * @param protocol 
 * @returns re-created adapter module object with mock tvl functions
 */
export function importAdapter(protocol: Protocol) {
    let adapterModule = getModule(protocol.module) ?? (adaptersData as any)[protocol.module]
    if (!adapterModule) throw new Error(`Could not find adapter for ${protocol.module}`)
    return unMockFunctions(adapterModule)
}

export function importAdapterDynamic(protocol: Protocol) {
    return getModule(protocol.module) ?? require(`@defillama/adapters/projects/${protocol.module}`)
}
