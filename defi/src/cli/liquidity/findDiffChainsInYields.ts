import fetch from "node-fetch";

async function main(){
    const pools:any = await fetch(`https://yields.llama.fi/pools`).then(r => r.json())
    console.log(new Set(pools.data.map((p:any)=>p.chain)))
}
main()