import { Dex } from "../../dexVolumes/dexAdapters";
import adapters from "./adapters_volumes"

// TODO: needs to be optimized
export function importVolumeAdapter(dex: Dex) {
    return (adapters as any)[dex.volumeAdapter]
}