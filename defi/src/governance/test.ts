import { updateSnapshots, } from './snapshot'

updateSnapshots().then(() => {
  console.log('done!')
  process.exit(0)
})