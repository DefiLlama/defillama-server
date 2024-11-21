require("dotenv").config();

import { getProtocol, } from "./utils";
import { clearProtocolCacheById } from "./utils/clearProtocolCache";

const main = async () => {
  const protocolArg = process.argv[2]
  const protocol = getProtocol(protocolArg)
  return clearProtocolCacheById(protocol.id)

};
main().then(() => {
  console.log('Done!!!')
  process.exit(0)
})

