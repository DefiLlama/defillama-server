import { Protocol } from "../../protocols/types";
import adapters from "./adapters"

export function importAdapter(protocol: Protocol) {
    // Use dynamic import to debug locally, will speed up compilation by a lot
    //return import(`@defillama/adapters/projects/${protocol.module}`)
    return (adapters as any)[protocol.module]
}