import { Protocol } from "../../protocols/types";
import fs from "fs";
import path from "path";

let adaptersData = {} as any

try {
    const _adaptersData = fs.readFileSync(path.join(__dirname, "tvlAdapterData.json"), "utf8");
    adaptersData = JSON.parse(_adaptersData) as any
} catch (error: any) {
    console.error("Error loading adapter data:", error?.message)
}

let missingAdapterErrorCount = 0
/**
 * 
 * @param protocol 
 * @returns re-created adapter module object with mock tvl functions
 */
export function importAdapter(protocol: Protocol) {
    let adapterModule = (adaptersData as any)[protocol.module]
    if (!adapterModule) {
        missingAdapterErrorCount++
        if (missingAdapterErrorCount <= 3) {
            // throw new Error(`Could not find adapter for ${protocol.module}`)
            console.error(`Could not find adapter for ${protocol.module} ${missingAdapterErrorCount === 3 ? '(Last warning)' : ''}`)
        }
        return {}
    }
    return adapterModule
}

export function importAdapterDynamic(protocol: Protocol) {

    try {  // wrap call to be safe, can be removed later
        const { allProtocols } = require(`../../../DefiLlama-Adapters/projects/helper/registries`)
        let pModule = protocol.module.replace(/\.js$/, '').replace(/\/index$/, '').replace(/\/api$/, '')
        let _module = allProtocols[pModule] || allProtocols[protocol.module]
        if (_module) return _module
    } catch (e: any) {
        console.error("Error loading allProtocols:", e?.message)
    }

    return require(`../../../DefiLlama-Adapters/projects/${protocol.module}`)
}
