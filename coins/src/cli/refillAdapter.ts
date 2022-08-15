require("dotenv").config()
import { writeFileSync } from "fs";
import adapters from "../adapters/index";
import { batchWrite } from "../utils/shared/dynamodb";

const adapterName = "curve";
const timestamp = 1660313930;

async function main() {
    const adapter = adapters[adapterName][adapterName];
    if (adapter === undefined) {
        throw new Error(`Adapter "${adapterName}" doesn't exist`)
    }
    if (process.env.HISTORICAL !== "true") {
        throw new Error("You must set env variable HISTORICAL to 'true'")
    }

    const results: any[] = await adapter(timestamp);
    writeFileSync("adapterResults.json", JSON.stringify(results))
    await batchWrite(results.flat(), true);
}

main();
