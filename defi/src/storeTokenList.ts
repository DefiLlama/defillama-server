import { wrapScheduledLambda } from "./utils/shared/wrap";
import fetch from "node-fetch";
import ddb, { batchGet } from "./utils/shared/dynamodb";
import { storeR2 } from "./utils/r2";

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
    const missingLogos = cgCoins.filter(coin=>allLogos[coin.id] === undefined)
    console.log(`${missingLogos.length} logos missing`)
    await Promise.all(missingLogos.map(async coin=>{
        try{
            const extended = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}`).then(r=>r.json())
            await ddb.put({
                PK: logoKey(coin.id),
                SK: 0,
                thumb: extended.image.thumb
            })
        } catch(e){
            return
        }
    }))

    await storeR2(`tokenlist/logos.json`, JSON.stringify(allLogos), true, false)
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
        "base"
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
        await storeR2(`tokenlist/${chain}.json`, JSON.stringify(chainCoins), true, false)
    }))
    await storeR2(`tokenlist/all.json`, JSON.stringify(cgCoins.map(coin => ({
        name: coin.name,
        symbol: coin.symbol,
        logoURI: allLogos[coin.id],
        platforms: coin.platforms,
    }))), true, false)
};

export default wrapScheduledLambda(handler);
