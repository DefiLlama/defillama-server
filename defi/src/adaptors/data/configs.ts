import dexs from "./dexs/config";
import fees from "./fees/config";
import aggregators from "./aggregators/config";
import options from "./options/config";
import incentives from "./incentives/config";
import derivatives from "./derivatives/config";
import aggregatorDerivatives from "./aggregator-derivatives/config";
import { AdaptorsConfig, IJSON } from "./types";

// TODO: add check to ensure that the parentIds are valid & if protocol type is chain, it is valid defillama id
const configs = {
  dexs,
  fees,
  aggregators,
  options,
  incentives,
  derivatives,
  aggregatorDerivatives
} as IJSON<AdaptorsConfig>;

export const getConfigByType = (type: string, module: string) => configs[type]?.[module];


const idMaps = {} as IJSON<IJSON<AdaptorsConfig[string]>>; 
Object.entries(configs).forEach(([metric, map]) => {
  if (!idMaps[metric]) {
    idMaps[metric] = Object.values(map).reduce((acc, curr) => {
      acc[curr.id] = curr;
      return acc;
    }, {} as IJSON<AdaptorsConfig[string]>);
  }
});

export default configs;
