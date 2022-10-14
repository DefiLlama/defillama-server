import data from "../../../protocols/data";
import { AdaptorsConfig, IJSON } from "../types"
import { sluggifyString } from "../../../utils/sluggify";
import getAllChainsFromAdaptors, { getAllProtocolsFromAdaptor, getChainByProtocolVersion, getProtocolsData, isDisabled } from "../../utils/getAllChainsFromAdaptors";
import { ProtocolAdaptor } from "../types";
import { Adapter } from "@defillama/adaptors/adapters/types";

// Obtaining all dex protocols
const dexes = data.filter(d => d.category === "Dexes" || d.category === 'Derivatives')

function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}

export type IImportsMap = IJSON<{ default: Adapter }>

export default (imports_obj: IImportsMap, config: AdaptorsConfig): ProtocolAdaptor[] =>
    Object.keys(imports_obj).map(adapterKey => {
        const dexFoundInProtocols = dexes.find(dexP =>
            dexP.name.toLowerCase()?.includes(adapterKey)
            || sluggifyString(dexP.name)?.includes(adapterKey)
            || dexP.gecko_id?.includes(adapterKey)
            || dexP.module.split("/")[0]?.includes(adapterKey)
        )
        if (dexFoundInProtocols && imports_obj[adapterKey].default)
            return {
                ...dexFoundInProtocols,
                module: adapterKey,
                config: config[adapterKey],
                chains: getAllChainsFromAdaptors([adapterKey], imports_obj),
                disabled: isDisabled(imports_obj[adapterKey].default),
                displayName: getDisplayName(dexFoundInProtocols.name, imports_obj[adapterKey].default),
                protocolsData: getProtocolsData(adapterKey, imports_obj[adapterKey].default)
            }
        // TODO: Handle better errors
        //console.error(`Missing info for ${adapterKey} DEX!`)
        return undefined
    }).filter(notUndefined);

function getDisplayName(name: string, adapter: Adapter) {
    if ("breakdown" in adapter && Object.keys(adapter.breakdown).length === 1)
        return `${Object.keys(adapter.breakdown)[0]}`
    return name
}