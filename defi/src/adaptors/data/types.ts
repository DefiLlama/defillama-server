import { Adapter, BaseAdapter, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { IImportObj } from "../../cli/buildRequires"
import { Protocol } from "../../protocols/types"

export interface ProtocolAdaptor extends Protocol {
    displayName: string
    config?: IConfig
    disabled: boolean
    protocolType?: ProtocolType
    protocolsData: IJSON<{
        chains: string[]
        disabled: boolean
        methodology?: string | IJSON<string>
    }> | null
    methodologyURL: string
    methodology?: string | IJSON<string>
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
    importModule: (module: string) => IImportObj['module']
    KEYS_TO_STORE: IJSON<string>
    config: IJSON<IConfig>
}