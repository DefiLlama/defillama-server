require("dotenv").config();
import chainAdapters from "../../../dimension-adapters/users/chains";
import { queryAllium } from "../../../dimension-adapters/helpers/allium";
import { PromisePool } from '@supercharge/promise-pool'
import { storeNewUsers } from "../../users/storeUsers";

async function main() {
    await PromisePool
        .withConcurrency(1)
        .for(chainAdapters.filter(c => c.getNewUsers)).process(async ({ name, id }) => {
            const rows = await queryAllium(`
SELECT
  date_trunc('day', block_timestamp) as date,
  COUNT(DISTINCT from_address) as total_new_users
FROM
  ${name}.raw.transactions
where nonce = 0
GROUP BY
  date_trunc('day', block_timestamp)`)
            await Promise.all(rows.map(async (row: any) => {
                const date = new Date(`${row.date}Z`)
                const start = Math.round(date.getTime() / 1e3)
                const end = start + 24 * 3600
                if (end > Date.now() / 1e3) {
                    return
                }
                await storeNewUsers(start, end, id, "all", row.total_new_users)
            }))
        })
}
main()