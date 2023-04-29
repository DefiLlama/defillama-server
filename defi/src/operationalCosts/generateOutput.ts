import { writeFileSync } from "fs"
import daos from "./daos"

writeFileSync(__dirname+"/output/expenses.json", JSON.stringify(daos));