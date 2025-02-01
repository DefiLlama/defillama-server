import { Write, } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";
import { getApi } from "../../utils/sdk";

export const config: any = {
	ethereum: {
		yusd: "0x1ce7d9942ff78c328a4181b9f3826fee6d845a97",
		decimals : 18
	}
}

export async function getTokenPrices(timestamp: number, chain: string) {
	const writes: Write[] = [];
	const pricesObject: any = {}
	const api = await getApi(chain, timestamp, true)
	const { yusd, decimals } = config[chain]

	const price = await api.call({ abi: 'function exchageRate view returns (uin256)', target: yusd })
	pricesObject[yusd] = { underlying: yusd, price: price / (10**decimals) }

	return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'yield-fi' })
}
