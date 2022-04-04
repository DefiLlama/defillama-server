import { getDailyVisitors, getPeriodDailyVisitors, getMostVisitedPages } from "../reports/buildReport"

async function main(){
    await getPeriodDailyVisitors(7)
}
main()