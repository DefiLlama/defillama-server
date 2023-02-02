import { Protocol } from "../../protocols/types";

// import directly through dynammic imports to avoid having typescript type-check all the adapters, which slows down script by a lot
export function importAdapter(protocol:Protocol){
    return import("@defillama/adapters/projects/"+protocol.module)
}

// import directly through dynammic imports to avoid having typescript type-check all the adapters, which slows down script by a lot
export function importTreasuryAdapter(protocol:Protocol){
    return import("@defillama/adapters/projects/treasury/"+protocol.treasury)
}