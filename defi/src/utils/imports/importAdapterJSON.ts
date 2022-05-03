import { Protocol } from "../../protocols/types";
import adapters from "./adapters.json"

export function importAdapter(protocol:Protocol){
    return (adapters as any)[protocol.module]
}