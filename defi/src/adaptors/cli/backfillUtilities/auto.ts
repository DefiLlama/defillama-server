import "../setup"
import { autoBackfill } from "./backfillFunction"

(async () => {
    try{
        await autoBackfill(process.argv)
    } catch(e){
        console.log(e)
    }
})()