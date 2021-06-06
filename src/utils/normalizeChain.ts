export function normalizeChain(chain:string){
    let normalizedChain = chain.toLowerCase()
    if(normalizedChain === "binance"){
        return 'bsc'
    } else if(normalizedChain === "wanchain"){
        return 'wan';
    }
    return normalizedChain
}

export function getDisplayChain(chains:string[]){
    if(chains.length>1){
        return "Multi-Chain"
    } else {
        return chains[0]
    }
}