import cgSymbols from "./symbols.json"

export function convertSymbols(balances: {
    [symbol:string]: number
}){
    Object.entries(balances).forEach(([symbol, amount])=>{
        const properSymbol = normalizeCgIds(symbol)
        if(properSymbol!==undefined){
            balances[properSymbol] = (balances[properSymbol] ?? 0) + amount
            delete balances[symbol]
        }
    })
}

export function normalizeCgIds(token: string): string | undefined {
    const suffix = token.startsWith('coingecko:') ? token.substring(10) : token
    const properSymbol = (cgSymbols as {[s:string]:string|undefined})[suffix]
    return properSymbol
}