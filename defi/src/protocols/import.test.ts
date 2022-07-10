const { importAdapter } = require("../utils/imports/importAdapter");
const protocols = require("./data");

for (const protocol of protocols) {
    importAdapter(protocol)
}
process.exit(0);