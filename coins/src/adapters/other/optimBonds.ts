import getWrites from "../utils/getWrites";
import { Write } from "../utils/dbInterfaces";

export function optimBonds(timestamp: number = 0) {
  const pricesObject: any = {
    OptimBond1: {
      underlying: "lovelace",
      price: 100,
      symbol: "OptimBond1",
      decimals: 0,
    },
  };

  const writes: Write[] = [];
  return getWrites({
    chain: "cardano",
    timestamp,
    writes,
    pricesObject,
    projectName: "optimBonds",
  });
}
