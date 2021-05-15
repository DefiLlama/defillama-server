export function normalizeChain(chain:string){
    let normalizedChain = chain.toLowerCase()
    if(normalizedChain === "binance"){
        return 'bsc'
    } else if(normalizedChain === "wanchain"){
        return 'wan';
    }
    return normalizedChain
}