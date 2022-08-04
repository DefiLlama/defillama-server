import executeAsyncBackfill from "./executeAsyncBackfill"
import getBackfillEvent from "./getBackfillEvent"
import printDexsList from "./printDexsList"
import "../setup.ts"

enum RUNS {
    PRINT_DEXS_LIST,
    GET_BACKFILL_EVENT,
    EXECUTE_ASYNC_BACKFILL
}

const RUN: RUNS = RUNS.GET_BACKFILL_EVENT

switch (Number(RUN)) {
    case RUNS.PRINT_DEXS_LIST:
        printDexsList()
        break
    case RUNS.GET_BACKFILL_EVENT:
        // Make sure to edit based on your needs!
        getBackfillEvent()
        break
    case RUNS.EXECUTE_ASYNC_BACKFILL:
        executeAsyncBackfill()
        break
    default:
        console.log("No case")
        break
} 