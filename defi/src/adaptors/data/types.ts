import { Adapter, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { Protocol } from "../../protocols/types"

export interface ProtocolAdaptor extends Protocol {
    displayName: string
    config?: IConfig
    disabled: boolean
    protocolType?: ProtocolType
    protocolsData: IJSON<{
        chains: string[]
        disabled: boolean
    }> | null
}

export interface IConfig {
    enabled?: boolean
    includedVolume?: string[]
    startFrom?: number
}


export interface IJSON<T> {
    [key: string]: T
}

export type AdaptorsConfig = IJSON<IConfig>

export type AdaptorData = {
    default: ProtocolAdaptor[]
    importModule: (module: string) => { default: Adapter }
    KEYS_TO_STORE: IJSON<string>
    config: IJSON<IConfig>
}