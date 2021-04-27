import type {Protocol} from "../protocols/data"

export default (prot:Protocol) => prot.name.toLowerCase().replace(" ", "-")