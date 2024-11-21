import { wrapScheduledLambda } from "./utils/shared/wrap";
import { updateSnapshots } from "./governance/snapshot";
import { updateCompounds } from "./governance/compound";

async function handler() {
    await Promise.all([
        updateSnapshots(),
        updateCompounds()
    ])
}

export default wrapScheduledLambda(handler);
