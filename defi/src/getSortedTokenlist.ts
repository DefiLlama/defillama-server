import fetch from "node-fetch"
import { successResponse, wrap, IResponse } from "./utils/shared";

const CG_TOKEN_API =
'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=<PLACEHOLDER>'

const arrayFetcher = (urlArr: string[]) => Promise.all(urlArr.map((url) => fetch(url).then((res) => res.json())))

function getCGMarketsDataURLs() {
	const urls: string[] = []
	const maxPage = 10
	for (let page = 1; page <= maxPage; page++) {
		urls.push(`${CG_TOKEN_API.replace('<PLACEHOLDER>', `${page}`)}`)
	}
	return urls
}

async function getAllCGTokensList(): Promise<Array<{ name: string; symbol: string; image: string }>> {
	const data = await arrayFetcher(getCGMarketsDataURLs())

	return data?.flat()?.map((t) => ({ ...t, symbol: t.symbol === 'mimatic' ? 'mai' : t.symbol })) ?? []
}

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
    const list = await getAllCGTokensList()
    return successResponse(list, 15*60)
};

export default wrap(handler);