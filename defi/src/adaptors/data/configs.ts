import dexs from "./dexs/config";
import fees from "./fees/config";
import aggregators from "./aggregators/config";
import options from "./options/config";
import incentives from "./incentives/config";
import protocols from "./protocols/config";
import derivatives from "./derivatives/config";
import { IJSON } from "./types";

const configs = {
    dexs,
    fees,
    aggregators,
    options,
    incentives,
    protocols,
    derivatives
}

export const getAvailableMetricsByModule = (modulePath: string) => Object.entries(configs).reduce((acc, [metric, map]) => {
    const [module] = modulePath.split("/")[0].split(/[/.]+/)
    const isMetricEnabled = map?.[module]?.enabled
    if (isMetricEnabled === true)
    acc[metric] = isMetricEnabled
    return acc
}, {} as IJSON<boolean>)

export default configs