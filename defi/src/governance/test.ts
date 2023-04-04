import { updateSnapshots, } from './snapshot'
import { updateAll, } from './compound'

main().then(() => {
  console.log('done!')
  process.exit(0)
})

async function main() {
  await updateSnapshots()
  await updateAll()
}