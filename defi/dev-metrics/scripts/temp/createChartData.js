const sdk = require('@defillama/sdk')
const db = require('../db')
const { ORG_MAPPING } = require('../utils')
const { saveChartData, getChartData } = require('../utils/r2')

// I think it is no longer used/never used and can be deleted
async function createChartData() {
  const entries = Object.entries(ORG_MAPPING)
  let i = 0
  const startTimestamp = +Date.now()
  for (const [key, object] of entries) {
    i++
    try {
      const startTime = Date.now()
      const orgs = []
      const repos = []
      object.github.forEach(i => {
        if (i.includes('/')) repos.push(i)
        else orgs.push(i)
      })
      const [devMonthlyChart, contribMonthlyChart] = await Promise.all([
        db.getOrgMonthyAggregation({ orgs, repos }),
        db.getOrgContributersMonthyAggregation({ orgs, repos }),
      ])

      const chartData = {
        id: key,
        devMonthlyChart,
        contribMonthlyChart,
        name: object.name || object.geckoId,
        lastUpdated: new Date().toISOString(),
      }

      await saveChartData(key, chartData)
      // await getChartData(key)
      const timeTaken = Number((Date.now() - startTime) / 1000).toPrecision(3)
      const avgTimeTaken = Number((Date.now() - startTimestamp) / (1000 * i)).toPrecision(3)
      const progress = Number(100 * i / entries.length).toPrecision(5)
      sdk.log(`${i} Updated chart for ${chartData.name} | time taken: ${timeTaken}s | avg: ${avgTimeTaken}s | progress: ${progress}% (${i}/${entries.length})`)

    } catch (e) {
      console.error(e)
    }
  }
}


createChartData()
  .catch(console.error)
  .then(() => {
    sdk.log('done')
    process.exit(0)
  })
