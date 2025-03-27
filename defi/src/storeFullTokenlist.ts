import { storeR2JSONString } from "./utils/r2";
import ddb, { batchGet } from "./utils/shared/dynamodb";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import fetch from "node-fetch";

async function buildCGCoinsList(){
  const list = (await fetch(`https://pro-api.coingecko.com/api/v3/coins/list?include_platform=true&x_cg_pro_api_key=${process.env.CG_KEY}`).then(r=>r.json())) as any[]
  const coins = await batchGet(list.map((coin: any) => ({
    PK: `coingecko#${coin.id}`,
    SK: 0,
  })));
  const idToMcap = {} as any;
  coins.forEach(coin=>{
    idToMcap[coin.PK] = coin.mcap;
  })
  return list.map(c=>({...c, mcap: idToMcap[`coingecko#${c.id}`]})).sort((a, b)=>(b.mcap ?? 0) - (a.mcap ?? 0))
}

const handler = async () => {
  const tokens = await buildCGCoinsList();
  await storeR2JSONString(`tokenlist/cgFull.json`, JSON.stringify(tokens), 12 * 60 * 60);
  const [nfts, protocols, other] = await Promise.all([getNfts(), getProtocols(), getOtherPages()])
  await storeR2JSONString(`tokenlist/search.json`, JSON.stringify({tokens, nfts, protocols, other}), 12 * 60 * 60);
};

async function getNfts() {
  const raw = await fetch(`https://nft.llama.fi/collections`).then((res) => res.json());
  const ethCoin = await fetch(`https://coins.llama.fi/prices/current/ethereum:0x0000000000000000000000000000000000000000`).then((res) => res.json());
  const ethPrice = ethCoin.coins["ethereum:0x0000000000000000000000000000000000000000"].price
  const nfts = raw.map((x:any)=>({
    collectionId: x.collectionId,
    name: x.name,
    mcap: (x.floorPrice * x.totalSupply * ethPrice) || 0,
    image: x.image,
  }));
  return nfts.sort((a:any, b:any)=>(b.mcap ?? 0) - (a.mcap ?? 0))
}

async function getProtocols() {
  const raw = await fetch("https://api.llama.fi/lite/protocols2").then((res) => res.json());
  const parentProtocols:any[] = raw.parentProtocols.map((p:any)=>({...p, tvl:0}))
  raw["protocols"].forEach((p:any)=>{
    if(p.parentProtocol){
      const parent = parentProtocols.find(pp=>pp.id === p.parentProtocol)
      parent.tvl += p.tvl
    }
  })
  const protocols = raw["protocols"].concat(parentProtocols).filter((protocol:any)=> (protocol.tvl > 10e3 || protocol.mcap > 100e3) && !protocol.parentProtocol).map((x: any) => ({
    name: x.name,
    url: x.url,
    logo: x.logo,
    category: x.category,
    tvl: x.tvl,
    mcap: x.mcap
  }));
  return protocols.sort((a:any, b:any)=>(b.tvl ?? 0) - (a.tvl ?? 0))
}

function getOtherPages(){
  return fetch("https://raw.githubusercontent.com/DefiLlama/defillama-app/main/src/directory/directory-urls.json").then((res) => res.json());
}

export default wrapScheduledLambda(handler);
