import { overwrites } from '../adapters/bridges/overwrites'
import { batchWrite } from '../utils/shared/dynamodb'

async function main() {
    await batchWrite(overwrites, true)
}
main()