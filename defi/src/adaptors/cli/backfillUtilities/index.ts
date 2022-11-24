import { AdapterType } from "@defillama/dimension-adapters/adapters/types"
import "../setup.ts"
import executeAsyncBackfill from "./executeAsyncBackfill"
import getBackfillEvent from "./getBackfillEvent"
/* import printDexsList from "./printDexsList" */

enum RUNS {
    PRINT_DEXS_LIST,
    GET_BACKFILL_EVENT,
    EXECUTE_ASYNC_BACKFILL
}

const RUN: RUNS = RUNS.EXECUTE_ASYNC_BACKFILL

switch (Number(RUN)) {
    case RUNS.PRINT_DEXS_LIST:
        /* printDexsList() */
        break
    case RUNS.GET_BACKFILL_EVENT:
        // Make sure to edit based on your needs!
        getBackfillEvent("uniswap" , AdapterType.DEXS, true)
        break
    case RUNS.EXECUTE_ASYNC_BACKFILL:
        executeAsyncBackfill()
        break
    default:
        console.log("No case")
        break
} 