import cgSymbols from "./symbols.json"

export function convertSymbols(balances: {
    [symbol:string]: number
}){
    Object.entries(balances).forEach(([symbol, amount])=>{
        const properSymbol = (cgSymbols as {[s:string]:string|undefined})[symbol]
        if(properSymbol!==undefined){
            balances[properSymbol] = (balances[properSymbol] ?? 0) + amount
            delete balances[symbol]
        }
    })
}