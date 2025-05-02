import * as fs from 'fs';

const file = 'negativeValues-2025-05-0.log'
const filePath = `./${file}`
const fileData = fs.readFileSync(filePath, 'utf8')
const parsedData = JSON.parse(fileData)



function fixNegativeValues(data: any) {
  const fixedData = JSON.parse(JSON.stringify(data)) // Deep clone the data to avoid mutating the original object
  Object.keys(fixedData).forEach((key) => {
    const protocol = fixedData[key]
    Object.keys(protocol).forEach((protocolKey) => {
      const protocolData = protocol[protocolKey]
      Object.keys(protocolData.badRecords).forEach((recordKey) => {
        const record = protocolData.badRecords[recordKey]
        Object.keys(record).forEach((recordField) => {
          if (typeof record[recordField] === 'number' && record[recordField] < 0) {
            record[recordField] = Math.abs(record[recordField])
          }
        })
      })
    })
  })
  return fixedData
}