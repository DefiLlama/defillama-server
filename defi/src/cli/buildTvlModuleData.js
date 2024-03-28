const fs = require("fs")

const adaptersFile = process.argv[2] 
const data = JSON.parse(fs.readFileSync(adaptersFile, "utf8"))

Object.keys(data).forEach((key) => data[key] = mockFunctions(require(data[key])))
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
