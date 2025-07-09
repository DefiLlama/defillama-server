const fs = require("fs")
const { mockFunctions } = require("@defillama/adapters/modules/util")
const { getModule } = require("@defillama/adapters/adapters")

const adaptersFile = process.argv[2] 
const data = JSON.parse(fs.readFileSync(adaptersFile, "utf8"))

Object.keys(data).forEach((key) => {
  data[key] = mockFunctions(getModule(key) ?? require(data[key]))
  if (data[key].hallmarks) {
    data[key].hallmarks = convertHallmarkStrings(data[key].hallmarks)
  }
})
fs.writeFileSync(adaptersFile, JSON.stringify(data))

function convertHallmarkStrings(hallmarks) {
  if (!Array.isArray(hallmarks)) return hallmarks
  return hallmarks.map((item) => {
    if (typeof item?.[0] === 'string') {
      let timestamp = Math.floor(+new Date(item[0])/1e3)
      if (!isNaN(timestamp)) 
        item[0] = timestamp
    }
    return item
  }).filter((item) => typeof item?.[0] === 'number')
}