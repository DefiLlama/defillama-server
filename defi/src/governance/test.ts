import '../api2/utils/failOnError'


import { updateSnapshots, } from './snapshot'
import { updateTallys, } from './tally'
import { updateCompounds, } from './compound'

main().then(() => {
  console.log('done!')
  process.exit(0)
})

async function main() {
  const funcs = {
    updateTallys,
    updateSnapshots,
    updateCompounds,
  }

  const promises = Object.entries(funcs).map(async ([key, fun]) => {
    const timeKey = 'Runtime_type_' + key
    console.time(timeKey)
    try {
      await fun()
    } catch (e) {
      console.error('Error fetching data for', key)
      console.error((e as any)?.message ?? e)
    }
    console.timeEnd(timeKey)
  })
  await Promise.all(promises)
}