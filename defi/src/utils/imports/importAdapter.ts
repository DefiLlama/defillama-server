import { Protocol } from "../../protocols/types";
import adapters from "./adapters"

export function importAdapter(protocol: Protocol) {
    return (adapters as any)[protocol.module]
}