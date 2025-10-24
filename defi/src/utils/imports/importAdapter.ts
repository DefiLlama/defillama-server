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
    return require(`../../../DefiLlama-Adapters/projects/${protocol.module}`)
}
