const { importAdapterDynamic } = require("../utils/imports/importAdapter");
const protocols = require("./data");

for (const protocol of Object.values(protocols.default)) {
    importAdapterDynamic(protocol)
}
process.exit(0);