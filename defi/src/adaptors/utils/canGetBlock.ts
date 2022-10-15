import { Chain, providers } from "@defillama/sdk/build/general";

const blockChains = Object.keys(providers)

export default (chain: Chain) => blockChains.includes(chain)