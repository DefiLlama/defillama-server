import { Protocol } from "../../protocols/types";
// import adapters from "./adapters"
import adaptersData from "./tvlAdapterData.json"


/**
 * 
 * @param protocol 
 * @returns re-created adapter module object with mock tvl functions
 */
export function importAdapter(protocol: Protocol) {
    let adapterModule = (adaptersData as any)[protocol.module]
    if (!adapterModule) throw new Error(`Could not find adapter for ${protocol.module}`)
    return mockFunctions(adapterModule)
}

export function importAdapterDynamic(protocol: Protocol) {
    return require(`@defillama/adapters/projects/${protocol.module}`)
}

function mockTvlFunction() {
    throw new Error('This is a mock function, you should not be calling it, maybe you need to use importAdapterDynamic instead?')
}


// code to replace function string with mock functions in an object all the way down
function mockFunctions(obj: any) {
    if (obj === "llamaMockedTVLFunction") {
        return mockTvlFunction
    } else if (typeof obj === "object") {
        Object.keys(obj).forEach((key) => obj[key] = mockFunctions(obj[key]))
    }
    return obj
}
