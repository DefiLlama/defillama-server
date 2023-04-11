import { getAllCGTokensList } from "./getSortedTokenlist";
import { storeR2JSONString } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";

const handler = async () => {
    const list = await getAllCGTokensList();
    await storeR2JSONString(`tokenlist/sorted.json`, JSON.stringify(list), 60 * 60);
};

export default wrapScheduledLambda(handler)