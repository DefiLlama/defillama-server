import BigNumber from "bignumber.js";
import fetch from "node-fetch";

const WRAPPED_GAS_TOKENS = ["WETH", "WAVAX", "WMATIC", "WFTM", "WBNB", "WCRO", "WONE"];
const SYMBOL_MAP: { [originSymbol: string]: string } = { BTCB: "WBTC", BTC: "WBTC" };

// making aliases so the hints are more readable cuz might mix up what all the strings are
type Address = string;
type PrefixAddress = string;
type Chain = string;
type Protocol = string;
type Symbol = string;

export interface Liq {
  owner: Address;
  liqPrice: number;
  collateral: PrefixAddress;
  collateralAmount: string;
  extra?: {
    displayName?: string;
    url: string;
  };
}

export interface Position {
  owner: Address;
  liqPrice: number;
  collateralValue: number;
  collateralAmount: number;
  chain: Chain;
  protocol: Protocol; // protocol adapter id, like "aave-v2", "liquity"...
  collateral: PrefixAddress; // token address formatted as "ethereum:0x1234..."
  displayName?: string;
  url?: string;
}

export type Price = {
  decimals: number;
  price: number;
  symbol: Symbol;
  timestamp: number;
  address: PrefixAddress;
  chain: Chain;
};

async function getPrices(collaterals: string[]) {
  const res = await fetch("https://coins.llama.fi/prices", {
    method: "POST",
    body: JSON.stringify({
      coins: collaterals,
    }),
  });
  const data = await res.json();
  const _prices = data.coins as {
    [address: string]: {
      decimals: number;
      price: number;
      symbol: string;
      timestamp: number;
    };
  };
  if (_prices["coingecko:tezos"]) {
    _prices["coingecko:tezos"].decimals = 6;
  }
  const prices: Price[] = Object.entries(_prices).map(([address, price]) => {
    const _chain = address.split(":")[0];
    // const chain = _chain === "avax" ? "avalanche" : _chain;
    let chain = _chain;
    if (_chain === "avax") {
      chain = "avalanche";
    } else if (address = 'coingecko:tezos') {
      chain = "tezos";
    }
    return {
      ...price,
      address,
      chain,
    };
  });
  return prices;
}

/**
 * Unifying uppercase or lowercase token symbols to lowercase, converting wrapped/bridged tokens into native symbol.
 *
 * @param symbol original coin symbol
 * @returns **lowercase** native symbol
 */
const getNativeSymbol = (symbol: string) => {
  if (symbol in SYMBOL_MAP) {
    return SYMBOL_MAP[symbol].toLowerCase();
  }

  const originSymbol =
    symbol.toLowerCase().endsWith(".e") || symbol.toLowerCase().endsWith(".b") ? symbol.slice(0, -2) : symbol;
  const nativeSymbol = WRAPPED_GAS_TOKENS.includes(originSymbol) ? originSymbol.substring(1) : originSymbol;
  return nativeSymbol.toLowerCase();
};

export async function aggregateAssetAdapterData(filteredAdapterOutput: { [protocol: Protocol]: Liq[] }) {
  const protocols = Object.keys(filteredAdapterOutput);

  // go thru all entries first to find all Collaterals (can be optimized but will be fine for now)
  // lowercase addresses
  const knownTokens = new Set<PrefixAddress>();
  for (const protocol of protocols) {
    filteredAdapterOutput[protocol].forEach((liq) => knownTokens.add(liq.collateral.toLowerCase()));
  }

  const prices = await getPrices(Array.from(knownTokens));
  // lowercase symbols
  const aggregatedData: Map<Symbol, { currentPrice: number; positions: Position[] }> = new Map();
  for (const price of prices) {
    const symbol = getNativeSymbol(price.symbol);
    if (!aggregatedData.has(symbol)) {
      aggregatedData.set(symbol, {
        currentPrice: price.price,
        positions: [],
      });
    }
  }

  for (const protocol of protocols) {
    const adapterData = filteredAdapterOutput[protocol];
    for (const liq of adapterData) {
      const price = prices.find((price) => price.address.toLowerCase() === liq.collateral.toLowerCase());
      if (!price) {
        continue;
      }

      const collateralAmountRaw = new BigNumber(liq.collateralAmount).div(10 ** price.decimals);

      const symbol = getNativeSymbol(price.symbol);
      aggregatedData.get(symbol)!.positions.push({
        owner: liq.owner,
        liqPrice: liq.liqPrice,
        collateralValue: collateralAmountRaw.times(liq.liqPrice).toNumber(),
        collateralAmount: collateralAmountRaw.toNumber(),
        chain: price.chain,
        protocol: protocol,
        collateral: liq.collateral.toLowerCase(),
        displayName: liq.extra?.displayName ?? liq.owner,
        url: liq.extra?.url,
      });
    }
  }

  for (const symbol in aggregatedData.keys()) {
    // array.sort is in place
    aggregatedData.get(symbol)!.positions.sort((a, b) => b.collateralValue - a.collateralValue);
  }

  return aggregatedData;
}
