import adapters from "./adapters";

export default function runAll() {
  Promise.all(Object.values(adapters).map((a) => a.default()));
} // ts-node coins/src/storeCoins.ts
