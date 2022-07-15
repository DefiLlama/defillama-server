import { volumeAdapterPrefix } from "../../dexVolumes/constants";
import { Dex } from "../../dexVolumes/dexAdapters";
import { Protocol } from "../../protocols/types";
import adapters from "./adapters"

export function importAdapter(protocol: Protocol) {
    return (adapters as any)[protocol.module]
}

export function importVolumeAdapter(dex: Dex) {
    return (adapters as any)[`${volumeAdapterPrefix}${dex.volumeAdapter}`]
}