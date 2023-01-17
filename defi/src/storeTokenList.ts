import { wrapScheduledLambda } from "./utils/shared/wrap";
import fetch from "node-fetch";
import { batchGet } from "./utils/shared/dynamodb";
import { store } from './utils/s3';

const logoKey = (coinId: string) => `cgLogo#${coinId}`

const handler = async () => {
    const cgCoins = (await fetch("https://api.coingecko.com/api/v3/coins/list?include_platform=true").then(r => r.json())) as {
        "id": string;
        "symbol": string;
        "name": string;
        "platforms": {
            [platform: string]: string
        }
    }[];
    const allLogos = (await batchGet(cgCoins.map(coin => ({
        PK: logoKey(coin.id),
        SK: 0
    })))).reduce((all, logo) => ({
        ...all,
        [logo.PK.slice(logoKey("").length)]: logo.thumb
    }), {})
    await store(`tokenlist/logos.json`, JSON.stringify(allLogos), true, false)
    await Promise.all([
        "avalanche",
        "polygon-pos",
        "fantom",
        "ethereum",
        "optimistic-ethereum",
        "arbitrum-one",
        "binance-smart-chain",
        "xdai",
        "meter",
        "metis-andromeda",
    ].map(async chain => {
        const chainCoins = cgCoins
            .filter(coin => coin.platforms[chain] !== undefined && coin.platforms[chain] !== "")
            .map(coin => {
                const logo = allLogos[coin.id]
                return {
                    address: coin.platforms[chain],
                    name: coin.name,
                    symbol: coin.symbol,
                    logoURI: logo,
                }
            }).reduce((all, coin) => {
                all[coin.address] = coin;
                delete all[coin.address].address;
                return all;
            }, {} as {
                [address: string]: any
            });
        await store(`tokenlist/${chain}.json`, JSON.stringify(chainCoins), true, false)
    }))
    await store(`tokenlist/all.json`, JSON.stringify(cgCoins.map(coin => ({
        name: coin.name,
        symbol: coin.symbol,
        logoURI: allLogos[coin.id],
        platforms: coin.platforms,
    }))), true, false)
};

export default wrapScheduledLambda(handler);
