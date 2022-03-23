import { Protocol } from "../../protocols/types";

export function importAdapter(protocol:Protocol){
    return import(
        `@defillama/adapters/projects/${protocol.module}`
    )
}