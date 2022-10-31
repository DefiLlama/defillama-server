import fetch from "node-fetch"
import { wrapScheduledLambda } from "./utils/shared/wrap";

export const daily = wrapScheduledLambda(async () => {
    await fetch("https://born-to-llama.herokuapp.com/send-daily-report")
});
