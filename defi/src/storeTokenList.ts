import { wrapScheduledLambda } from "./utils/shared/wrap";
import fetch from "node-fetch";
import dynamodb from "./utils/shared/dynamodb";
import { store } from './utils/s3';

const handler = async () => {
    const cgCoins = (await fetch("https://api.coingecko.com/api/v3/coins/list?include_platform=true").then(r => r.json())) as {
        "id": string;
        "symbol": string;
        "name": string;
        "platforms": {
            [platform: string]: string
        }
    }[];
    await Promise.all([
        "avalanche",
        "polygon-pos",
        "fantom",
        "ethereum",
        "optimistic-ethereum",
        "arbitrum-one",
        "binance-smart-chain",
        "xdai",
        "meter"
    ].map(async chain => {
        const chainCoins = (await Promise.all(cgCoins
            .filter(coin => coin.platforms[chain] !== undefined && coin.platforms[chain] !== "")
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
            })
        )).reduce((all, coin)=>{
            all[coin.address]=coin;
            delete all[coin.address].address;
            return all;
        }, {} as {
            [address:string]:any
        });
        await store(`tokenlist/${chain}.json`, JSON.stringify(chainCoins), true, false)
    }))
};

export default wrapScheduledLambda(handler);
