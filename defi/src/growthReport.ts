import { getMostVisitedPages } from "./reports/buildReport";
import { wrapScheduledLambda } from "./utils/shared/wrap";

export const daily = wrapScheduledLambda(async () => {
    await getMostVisitedPages()
});
