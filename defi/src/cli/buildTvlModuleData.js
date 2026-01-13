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
    console.info(`Error processing ${key}: skipping...`)
  }
})
fs.writeFileSync(adaptersFile, JSON.stringify(data))

//Replace all functions with mock functions in an object all the way down
function mockFunctions(obj) {
  if (typeof obj === "function") {
    return '_f'  // llamaMockedTVLFunction
  } else if (typeof obj === "object") {
    Object.keys(obj).forEach((key) => obj[key] = mockFunctions(obj[key]))
  }
  return obj
}

function convertHallmarkStrings(hallmarks) {
  if (!Array.isArray(hallmarks)) return hallmarks
  return hallmarks.map((item) => {
    if (typeof item?.[0] === 'string') {
      item[0] = dateStringToTimestamp(item[0])
    }
    if (Array.isArray(item?.[0])) {
      item[0].forEach((subItem, index) => {
        if (typeof subItem === 'string') {
          item[0][index] = dateStringToTimestamp(subItem)
        }
      })
    }
    return item
  }).filter((item) => {
    if (typeof item?.[0] === 'number') return true
    // if it is a range hallmark
    if (Array.isArray(item?.[0] && typeof item[0][0] === 'number' && typeof item[0][1] === 'number')) {
      return true
    }
    return false
  })
}

function dateStringToTimestamp(dateString) {

  let timestamp = Math.floor(+new Date(dateString) / 1e3)
  if (!isNaN(timestamp))
    return timestamp
  return dateString
}