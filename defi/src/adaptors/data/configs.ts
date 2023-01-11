import dexs from "./dexs/config";
import fees from "./fees/config";
import aggregators from "./aggregators/config";
import options from "./options/config";
import incentives from "./incentives/config";
import protocols from "./protocols/config";
import derivatives from "./derivatives/config";

// With dynamic imports loads less stuff into memory but becomes slower
// w/ dynamic imports 1 dex -> 19sec
// without 1 dex -> 1.6s (all dexs =200 aprox 4s)
export default {
    dexs,
    fees,
    aggregators,
    options,
    incentives,
    protocols,
    derivatives
}