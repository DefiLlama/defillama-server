//import { Protocol } from "../../../defi/src/protocols/types";
import adapters from "./adapters";

export function importAdapter(protocol: any) {
  return (adapters as any)[protocol.module];
}
