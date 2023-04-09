import { updateSnapshots, } from './snapshot'
import { updateCompounds, } from './compound'

main().then(() => {
  console.log('done!')
  process.exit(0)
})

async function main() {
  // yeah, it would be per protocol, let me look up how to get median
  await updateSnapshots()
  await updateCompounds()
}