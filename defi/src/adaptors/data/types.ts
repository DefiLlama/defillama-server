import { ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { IImportObj } from "../../cli/buildRequires"
import { Protocol } from "../../protocols/types"
import { ICleanRecordsConfig } from "../handlers/helpers/generateCleanRecords"

export interface ProtocolAdaptor extends Protocol {
    defillamaId: string
    displayName: string
    config?: IConfig
    id2: string
    disabled: boolean
    enabled?: boolean
    isProtocolInOtherCategories?: boolean
    protocolType?: ProtocolType
    adapterType?: ProtocolType
    versionKey?: string
    methodologyURL: string
    methodology?: string | IJSON<string>
    allAddresses?: Array<string>
    startFrom?: number
    childProtocols?: Array<ProtocolAdaptor>
}

export interface IConfig {
    id: string
    parentId?: string
    latestFetchIsOk?: boolean
    enabled?: boolean
    includedVolume?: string[]
    startFrom?: number
    disabled?: boolean
    displayName?: string
    cleanRecordsConfig?: ICleanRecordsConfig
    isChain?: boolean
    protocolsData?: IJSON<Omit<IConfig, 'protocolsData'>>,
}


export interface IJSON<T> {
    [key: string]: T
}

export type AdaptorsConfig = IJSON<IConfig>

export type AdaptorData = {
    default: ProtocolAdaptor[]
    protocolAdaptors: ProtocolAdaptor[]
    childProtocolAdaptors: ProtocolAdaptor[]
    importModule: (module: string) => any
    KEYS_TO_STORE: IJSON<string>
    config: IJSON<IConfig>
    rules?: IJSON<(extraDimensions: IJSON<number | null>, category: string) => void>,
    protocolMap: IJSON<ProtocolAdaptor>
}