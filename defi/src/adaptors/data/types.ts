import { Adapter } from "@defillama/adaptors/adapters/types"
import { Protocol } from "../../protocols/types"

export interface ProtocolAdaptor extends Protocol {
    displayName: string
    config?: IConfig
    disabled: boolean
    protocolsData: IJSON<{
        chains: string[]
        disabled: boolean
    }> | null
}

export interface IConfig {
    enabled?: boolean
    includedVolume?: string[]
}


export interface IJSON<T> {
    [key: string]: T
}

export type AdaptorsConfig = IJSON<IConfig>

export type AdaptorData = {
    default: ProtocolAdaptor[]
    importModule: (module: string) => { default: Adapter }
    KEYS_TO_STORE: IJSON<string>
}