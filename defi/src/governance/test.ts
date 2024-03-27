process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err)
  process.exit(1)
})

import { updateSnapshots, } from './snapshot'
import { updateTallys, } from './tally'
import { updateCompounds, } from './compound'

main().then(() => {
  console.log('done!')
  process.exit(0)
})

async function main() {
  await Promise.all([
    updateTallys(),
    updateSnapshots(),
    updateCompounds(),
  ])
}