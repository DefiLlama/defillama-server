
        import { Adapter } from "@defillama/adaptors/adapters/types";
        export default {
        "lyra": require("@defillama/adaptors/derivatives/lyra"),
        } as {[key:string]: {default: Adapter} }