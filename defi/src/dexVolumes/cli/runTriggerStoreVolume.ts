import "./setup.ts"
import { handler } from "../../triggerStoreVolume";
// import volumeAdapters from "../dexAdapters";
import event from "./backfillUtilities/output/backfill_event.json"
handler(event)