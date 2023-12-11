import { humanizeNumber } from "@defillama/sdk/build/computeTVL/humanizeNumber";
import { getLastRecord, hourlyRawTokensTvl, hourlyTvl, hourlyUsdTokensTvl } from "../utils/getLastRecord";
import { getProtocol } from "./utils";

// AWS_REGION='eu-central-1' tableName='prod-table' npx ts-node src/cli/displayLastData.ts Astroport injective

async function main(){
    const id = getProtocol(process.argv[2]).id
    const chain = process.argv[3].toLowerCase()
    const [tvl, usd, raw] = await Promise.all([hourlyTvl, hourlyUsdTokensTvl, hourlyRawTokensTvl].map(func=>getLastRecord(func(id))))
    console.log("TVL", humanizeNumber(tvl![chain]))
    console.log("USD tokens", usd![chain])
    console.log("Raw", raw![chain])
}
main()