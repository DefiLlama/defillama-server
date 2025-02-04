import { Write, } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";

export const config: any = {
	ethereum: {
		susd: "0x4F8E1426A9d10bddc11d26042ad270F16cCb95F2", // sUSD accounting token for YieldFi protocol https://docs.yield.fi/
		decimals: 18
	}
}

export async function getTokenPrices(timestamp: number, chain: string) {
	const writes: Write[] = [];
	const pricesObject: any = {}
	const { susd } = config[chain]

	pricesObject[susd] = { underlying: susd, price: 1.0 }

	return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'yield-fi' })
}