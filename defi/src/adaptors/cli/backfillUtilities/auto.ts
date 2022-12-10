import "./../setup.ts"
import { autoBackfill } from "./backfillFunction"

(async () => {
    await autoBackfill(process.argv)
})()