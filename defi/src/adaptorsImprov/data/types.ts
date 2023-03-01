import { ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { IImportObj } from "../../cli/buildRequires"
import { Protocol } from "../../protocols/types"

export interface ProtocolAdaptor extends Protocol {
    displayName: string
    config?: IConfig
    disabled: boolean
    enabled?: boolean
    protocolType?: ProtocolType
    versionKey?: string
    methodologyURL: string
    methodology?: string | IJSON<string>
    allAddresses?: Array<string>
}

export interface IConfig {
    id: string
    latestFetchIsOk?: boolean
    enabled?: boolean
    includedVolume?: string[]
    startFrom?: number
    disabled?: boolean
    displayName?: string
    protocolsData?: IJSON<Omit<IConfig, 'protocolsData'>>,
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
    dimensionRules?: IJSON<(extraDimensions: IJSON<number | null>, category: string) => void>
}