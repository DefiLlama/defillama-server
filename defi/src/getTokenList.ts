import { successResponse, wrap, IResponse } from "./utils/shared";
import fetch from "node-fetch";
import dynamodb from "./utils/shared/dynamodb";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const chain = event.pathParameters?.chain?.toLowerCase()!;
    const cgCoins = (await fetch("https://api.coingecko.com/api/v3/coins/list?include_platform=true").then(r => r.json())) as {
        "id": string;
        "symbol": string;
        "name": string;
        "platforms": {
            [platform: string]: string
        }
    }[];
    const filteredCoins = await Promise.all(cgCoins
        .filter(coin => coin.platforms[chain] !== undefined)
        .map(async coin => {
            const logo = await dynamodb.get({
                PK: `cgLogo#${coin.id}`,
                SK: 0
            })
            return {
                address: coin.platforms[chain],
                name: coin.name,
                symbol: coin.symbol,
                //decimals: 18,
                logoURI: logo.Item?.thumb,
            }
        }));

    return successResponse(
        {
            coins: filteredCoins,
        },
        10 * 60
    ); // 10 mins cache
};

export default wrap(handler);
