import { wrapScheduledLambda } from "./utils/shared/wrap";
//import protocols from "./protocols/data";
import axios from "axios"
import { sendMessage } from "./utils/discord";

const urls = [
    // HTML
    "https://defillama.com/yields",
    "https://defillama.com/",
    "https://defillama.com/chains",
    "https://defillama.com/stablecoins",
    "https://defillama.com/stablecoins/chains",

    // API
    "https://api.llama.fi/protocols",
    "https://api.llama.fi/protocol/Lido", // multiple
    "https://api.llama.fi/updatedProtocol/Lido", // multiple
    "https://api.llama.fi/charts",
    "https://api.llama.fi/charts/Ethereum", // multiple
    "https://api.llama.fi/tvl/Lido", // multiple
    "https://api.llama.fi/chains",

    // Stablecoins
    "https://stablecoins.llama.fi/stablecoins",
    "https://stablecoins.llama.fi/stablecoincharts/all",
    "https://stablecoins.llama.fi/stablecoincharts/Ethereum", // multiple
    "https://stablecoins.llama.fi/stablecoin/tether", // multiple
    "https://stablecoins.llama.fi/stablecoinchains",
    "https://stablecoins.llama.fi/stablecoinprices",

    // Yields
    "https://yields.llama.fi/pools",
    "https://yields.llama.fi/chart/0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8", // multiple

    // Internal
    "https://api.llama.fi/lite/protocols2",
    "https://api.llama.fi/lite/charts",
    "https://api.llama.fi/lite/charts/Ethereum", // multiple
]

const alert= (message:string)=>sendMessage(message, process.env.MONITOR_WEBHOOK!)

const handler = async () => {
    const responses = {} as any
    // Main urls
    await Promise.all(urls.map(async url=>{
        try{
            const res = await axios.get(url)
            const age = res.headers.age
            if(age && Number(age) > 3600){
                alert(`${url}'s age is ${age}, higher than 3600`)
            } else {
                const lastModified = res.headers["last-modified"]
                if(lastModified && (new Date().getTime() - new Date(lastModified).getTime()) > 3600e3){
                    alert(`${url} was modified over 1 hour ago (${lastModified})`)
                }
            }
            responses[url] = res.data;
        } catch(e){
            alert(`${url} failed`)
        }
    }))
    // TODO: test a random sample of endpoints market with `multiple`
};

export default wrapScheduledLambda(handler);
