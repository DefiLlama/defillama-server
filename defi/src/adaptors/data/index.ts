import { AdapterType } from "@defillama/adaptors/adapters/types";
import { AdaptorData } from "./types";

export default async (adaptorType: AdapterType) => (await import(`../data/${adaptorType}`)) as AdaptorData