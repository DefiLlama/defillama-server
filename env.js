require('dotenv').config()
module.exports = {
    ETHEREUM_RPC: process.env.ETHEREUM_RPC,
    BSC_RPC: process.env.BSC_RPC,
    POLYGON_RPC: process.env.POLYGON_RPC,
    OUTDATED_WEBHOOK: process.env.OUTDATED_WEBHOOK
}
