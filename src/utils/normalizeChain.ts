export function normalizeChain(chain: string) {
  let normalizedChain = chain.toLowerCase();
  if (normalizedChain === "binance") {
    return "bsc";
  } else if (normalizedChain === "wanchain") {
    return "wan";
  } else if(normalizedChain === "kucoin"){
    return "kcc"
  }
  return normalizedChain;
}

export function getChainDisplayName(normalizedChain:string){
  switch(normalizedChain){
    case "bsc":
      return "Binance"
    case "wan":
      return "Wanchain"
    case "kcc":
      return "Kucoin"
    case "xdai":
      return "xDai"
    case "avax":
      return "Avalanche"
    case "okexchain":
      return "OKExChain"
    case "defichain":
      return "DefiChain"
    case "polynetwork":
      return "PolyNetwork"
    case "eos":
      return "EOS"
    case "neo":
      return "NEO"
    case "rsk":
      return "RSK"
    case "iotex":
      return "IoTeX"
    case "thundercore":
      return "ThunderCore"
    default:
      return normalizedChain.slice(0,1).toUpperCase()+normalizedChain.slice(1) // Capitalize first letter
  }
}

export function getDisplayChain(chains: string[]) {
  if (chains.length > 1) {
    return "Multi-Chain";
  } else {
    return chains[0];
  }
}
