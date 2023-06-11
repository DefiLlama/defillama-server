const { getOrgMonthyAggregation, getOrgContributersMonthyAggregation} = require('../db')

async function run() {
  const org = 'ethereum'
  const orgMonthlyAgg = await getOrgMonthyAggregation(org)
  const orgContributersMonthlyAgg = await getOrgContributersMonthyAggregation(org)
  console.log({orgMonthlyAgg, orgContributersMonthlyAgg})
}

run().catch(console.error).then(process.exit)