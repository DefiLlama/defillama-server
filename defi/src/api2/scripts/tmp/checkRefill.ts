import '../../utils/failOnError'

import { init, } from "../../../adaptors/db-utils/db2";
import { Tables } from '../../db/tables';
import { Op } from 'sequelize';
import fs from 'fs'


async function run1() {
  await init()


  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const result: any = await Tables.DIMENSIONS_DATA.findAll({
    where: { createdat: { [Op.gte]: oneWeekAgo.toISOString() } },
    attributes: ['data', 'timestamp', 'id', 'timeS', 'createdat', 'updatedat', 'type'],
    raw: true,
    order: [['timestamp', 'ASC']],
  })

  console.log(result.length)
  return result
  // fs.writeFileSync('data.log', JSON.stringify(result, null, 2))

}

async function run() {
  const result = await run1()
  // const data = fs.readFileSync('data.log', 'utf8')
  // const result = JSON.parse(data)
  const res1 = result.filter((i: any) => {
    const createTs = (+new Date(i.createdat)) / 1e3
    return createTs - i.timestamp > 48 * 60 * 60 // 48 hours
  })
  const res2 = res1.filter((i: any) => {
    const aggValue = Object.values(i.data.aggregated ?? {} as any)?.[0]?.value
    return aggValue > 0
  })

  console.log(result.length, res1.length, res2.length)
  const allCache = {} as any
  res2.forEach((i: any) => {
    if (!allCache[i.type]) allCache[i.type] = {}
    if (!allCache[i.type][i.id]) allCache[i.type][i.id] = []
    Object.keys(i.data.aggregated).forEach((key: any) => {
      if (key.startsWith('t')) delete i.data.aggregated[key]
    })
    if (!Object.keys(i.data.aggregated).length) return;
    allCache[i.type][i.id].push({ id: i.id, timeS: i.timeS, value: Object.values(i.data.aggregated as any)[0].value, key: Object.keys(i.data.aggregated)[0] })
  })

  const possibleDuplicates = [] as any[]
  Object.entries(allCache).forEach(([adapterType, protocols]: any) => {
    console.log(adapterType)
    Object.entries(protocols).forEach(([protocolId, data]: any) => {
      console.table(data)
      if (data.length < 3) return;
      let data0 = data[0].value
      if (data[1].value === data0 && data[2].value === data0) {
        possibleDuplicates.push({ adapterType, protocolId, data })
      }
    })
  })

  console.log('possible duplicates', possibleDuplicates.length)
  possibleDuplicates.forEach((i: any) => {
    console.log(i.adapterType, i.protocolId)
    console.table(i.data)
  })
  process.exit(0);
}

run().catch(console.error).then(() => process.exit(0))
