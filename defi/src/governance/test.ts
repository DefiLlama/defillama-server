import { updateSnapshots, } from './snapshot'
import { updateCompounds, } from './compound'

main().then(() => {
  console.log('done!')
  process.exit(0)
})

async function main() {
  await updateSnapshots()
  await updateCompounds()
}