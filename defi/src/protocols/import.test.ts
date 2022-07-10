const { importAdapter } = require("../utils/imports/importAdapter");
const protocols = require("./data");

for (const protocol of Object.values(protocols.default)) {
    importAdapter(protocol)
}
process.exit(0);