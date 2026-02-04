import routerAddresses from "./routerAddresses"
import { countUsers } from "../utils/countUsers";

export default routerAddresses.map(addresses=>({
    name: addresses.name,
    id: addresses.id,
    addresses: addresses.addresses,
    getUsers: countUsers(addresses.addresses as any)
}))
