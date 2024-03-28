require("dotenv").config();
import chainAdapters from "../../../dimension-adapters/users/chains";
import { queryAllium } from "../../../dimension-adapters/helpers/allium";
import { PromisePool } from '@supercharge/promise-pool'
import { storeNewUsers } from "../../users/storeUsers";

async function main() {
  const { errors } = await PromisePool
    .withConcurrency(1)
    .for(chainAdapters.filter(c => c.getNewUsers)).process(async ({ name, id }) => {
      try {
        const rows = await queryAllium(`
SELECT
  date_trunc('day', block_timestamp) as date,
  COUNT(DISTINCT from_address) as total_new_users
FROM
  ${name}.raw.transactions
where nonce = 0
GROUP BY
  date_trunc('day', block_timestamp)`)
        await PromisePool
          .withConcurrency(16)
          .for(rows).process(async (row: any) => {
            const date = new Date(`${row.date}Z`)
            const start = Math.round(date.getTime() / 1e3)
            const end = start + 24 * 3600
            if (end > Date.now() / 1e3) {
              return
            }
            try {
              await storeNewUsers(start, end, id, "all", row.total_new_users)
            } catch (e) {
              if (!String(e).includes("duplicate key value violates unique constraint")) {
                return; // ignore
              }
              throw e
            }
          })
        console.log(name, "done")
      } catch (e) {
        console.log(name, e)
        throw e
      }
    })
  console.log(errors)
}
main()