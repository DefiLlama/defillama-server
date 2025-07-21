const fs = require("fs")

const adaptersFile = process.argv[2]
const data = JSON.parse(fs.readFileSync(adaptersFile, "utf8"))

Object.keys(data).forEach((key) => {
  try {
    data[key] = mockFunctions(require(data[key]))
    if (data[key].hallmarks) {
      data[key].hallmarks = convertHallmarkStrings(data[key].hallmarks)
    }
  } catch (e) {
    console.error(`Error processing ${key}:`, e)
  }
})
fs.writeFileSync(adaptersFile, JSON.stringify(data))

//Replace all fuctions with mock functions in an object all the way down
function mockFunctions(obj) {
  if (typeof obj === "function") {
    return 'llamaMockedTVLFunction'
  } else if (typeof obj === "object") {
    Object.keys(obj).forEach((key) => obj[key] = mockFunctions(obj[key]))
  }
  return obj
}

function convertHallmarkStrings(hallmarks) {
  if (!Array.isArray(hallmarks)) return hallmarks
  return hallmarks.map((item) => {
    if (typeof item?.[0] === 'string') {
      let timestamp = Math.floor(+new Date(item[0]) / 1e3)
      if (!isNaN(timestamp))
        item[0] = timestamp
    }
    return item
  }).filter((item) => typeof item?.[0] === 'number')
}