import dexs from "./dexs/config";
import fees from "./fees/config";
import aggregators from "./aggregators/config";
import options from "./options/config";
import incentives from "./incentives/config";
import protocols from "./protocols/config";
import derivatives from "./derivatives/config";
import { AdaptorsConfig, IJSON } from "./types";

const configs = {
    dexs,
    fees,
    aggregators,
    options,
    incentives,
    protocols,
    derivatives
} as IJSON<AdaptorsConfig>

export const getConfigByType = (type: string, module: string) => configs[type]?.[module]

export const getAvailableMetricsByModule = (modulePath: string) => Object.entries(configs).reduce((acc, [metric, map]) => {
    const [module] = modulePath.split("/")[0].split(/[/.-]+/)
    const isMetricEnabled = map?.[module.toLocaleLowerCase()]?.enabled
    if (isMetricEnabled === true)
    acc[metric] = isMetricEnabled
    return acc
}, {} as IJSON<boolean>)

export default configs