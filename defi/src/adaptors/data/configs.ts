import dexs from "./dexs/config";
import fees from "./fees/config";
import aggregators from "./aggregators/config";
import options from "./options/config";
import incentives from "./incentives/config";
import protocols from "./protocols/config";
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
  protocols,
  derivatives,
  aggregatorDerivatives
} as IJSON<AdaptorsConfig>;

export const getConfigByType = (type: string, module: string) => configs[type]?.[module];


const idMaps = {} as IJSON<IJSON<AdaptorsConfig[string]>>; 
Object.entries(configs).forEach(([metric, map]) => {
  if (!idMaps[metric]) {
    idMaps[metric] = Object.values(map).reduce((acc, curr) => {
      acc[curr.id] = curr;
      if (curr.parentId) {
        acc[curr.parentId] = curr;
      }
      if (curr.protocolsData) {
        Object.values(curr.protocolsData).forEach((protData) => {
          acc[protData.id] = protData;
        });
      }
      return acc;
    }, {} as IJSON<AdaptorsConfig[string]>);
  }
});

export const getAvailableMetricsById = (id: string) =>
  Object.entries(configs).reduce((acc, [metric]) => {
    const isMetricEnabled = idMaps?.[metric]?.[id]?.enabled;
    if (isMetricEnabled === true) acc[metric] = isMetricEnabled;
    return acc;
  }, {} as IJSON<boolean>);

export default configs;
