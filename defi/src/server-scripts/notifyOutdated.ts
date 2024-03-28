import { notifyOutdatedPG } from "../notifyOutdated";

notifyOutdatedPG().catch(console.error).then(() => process.exit(0))