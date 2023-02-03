import { AdapterResult } from "../../types/adapters";
import adapter from "./tornado";
const chain: string = "ethereum";

export const governance = adapter(
  "0x179f48C78f57A3A78f0608cC9197B8972921d1D2",
  chain,
  {
    // cliff at 1616038233
    beforeCliff: 1616025600,
    afterCliff: 1616040000,
    beforeStep: 1641859200,
    afterStep: 1642032000,
  },
);
const investorTimestamps = {
  // cliff at 1639366169
  beforeCliff: 1639353600,
  afterCliff: 1639368000,
  beforeStep: 1641859200,
  afterStep: 1642118400,
};
export const teamAndInvestors: Promise<AdapterResult[][]> = Promise.all(
  [
    "0x5f48c2a71b2cc96e3f0ccae4e39318ff0dc375b2",
    "0x00d5ec4cdf59374b2a47e842b799027356eac02b",
    "0x77c08248c93ab53ff734ac555c932f8b9089d4c9",
    "0xc3877028655ebe90b9447dd33de391c955ead267",
    "0xb43432ec23e228fb7cb0fa52968949458b509f4f",
  ].map((a: string) => adapter(a, chain, investorTimestamps)),
);
