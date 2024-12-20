import { overwrites } from '../adapters/bridges/overwrites'
import { batchWrite } from '../utils/dynamodbV3'

async function main() {
    await batchWrite(overwrites, true)
}
main()