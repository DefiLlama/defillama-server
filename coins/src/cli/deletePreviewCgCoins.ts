require("dotenv").config();
import fetch from "node-fetch";
import { getCoingeckoLock, setTimer } from "../utils/shared/coingeckoLocks";
import ddb from "../utils/shared/dynamodb";
import { cgPK } from "../utils/keys";
import { iterateOverPlatforms } from "../utils/coingeckoPlatforms";

// IMPORTANT! READ ALL COMMENTS BEFORE USING

async function retryCoingeckoRequest(
    url: string, retries: number
): Promise<CoingeckoResponse> {
    for (let i = 0; i < retries; i++) {
        await getCoingeckoLock();
        try {
            const coinData = await fetch(url).then((r) => r.json());
            return coinData;
        } catch (e) {
            continue;
        }
    }
    throw new Error(`failed on ${url}`)
}

interface CoingeckoResponse {
    [cgId: string]: {
        usd: number;
        usd_market_cap: number;
    };
}

async function main() {
    setTimer(1500);
    const coins = await fetch(
        `https://pro-api.coingecko.com/api/v3/coins/list?include_platform=true?&x_cg_pro_api_key=${process.env.CG_KEY}`
    ).then((r) => r.json()) as any[];
    const step = 80;
    for (let i = 0; i < coins.length; i += step) {
        const coinData = await retryCoingeckoRequest(
            `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coins.slice(i, i + step).map(c => c.id).join(
                ","
            )}&vs_currencies=usd&include_market_cap=true?&x_cg_pro_api_key=${process.env.CG_KEY}`,
            10
        );
        await Promise.all(Object.entries(coinData).map(async ([id, d]) => {
            if (d.usd === undefined) {
                const records = (await ddb.query({
                    ExpressionAttributeValues: {
                        ":pk": cgPK(id)
                    },
                    KeyConditionExpression: "PK = :pk",
                })).Items
                if (records !== undefined) {
                    await Promise.all(records?.map(async r => {
                        if(r.price === undefined){
                            return ddb.delete({
                                Key:{
                                    PK: r.PK,
                                    SK: r.SK
                                }
                            })
                        }
                    }))
                }
                const coin = coins.find(c=>c.id === id)
                // IMPORTANT! Change (storedItem.Item === undefined) to (storedItem.Item !== undefined)
                await iterateOverPlatforms(coin, async (PK) => {
                    await ddb.delete({
                        Key:{
                            PK,
                            SK:0
                        }
                    })
                })
            }
        }))
        console.log(i)
    }
}
main()