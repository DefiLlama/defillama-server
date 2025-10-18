import chains from "./chains"
import routers from "./routers/index"
import protocolAddresses from "./routers/routerAddresses";
import compoundV2, {addresses as compoundAddresses} from "./compound-v2";
import { ExtraProtocolAddresses } from "./utils/types";

export default routers.concat(chains as any[]).concat(compoundV2 as any[])

export const addressList = (protocolAddresses as ExtraProtocolAddresses[]).concat(compoundAddresses)