export function normalizeChain(chain:string){
    let normalizedChain = chain.toLowerCase()
    return normalizedChain === "binance"?'bsc':normalizedChain;
}