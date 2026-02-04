import { getCurrentUnixTimestamp } from "../../utils/date";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const assets: { [chain: string]: { [symbol: string]: string } } = {
  ethereum: {
    icETH: "0x7c07f7abe10ce8e33dc6c5ad68fe033085256a84",
    hyETH: "0xc4506022Fb8090774E8A628d5084EED61D9B99Ee",
  },
  base: {
    wstETH15x: "0xc8DF827157AdAf693FCb0c6f305610C28De739FD",
  },
};

async function getPrices(timestamp: number, chain: string): Promise<Write[]> {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);

  const positions = await api.multiCall({
    abi: "function getPositions() external view returns (tuple(address component, address module, int256 unit, uint8 positionState, bytes data)[])",
    calls: Object.values(assets[chain]).map((target) => ({ target })),
    permitFailure: true,
  });

  const componentData = await fetchComponents(positions);
  const prices = calculatePricesFromPositions(positions, componentData);

  const writes: Write[] = [];
  Object.keys(assets[chain]).map((symbol: string) => {
    if (isNaN(prices[symbol].price)) return;
    addToDBWritesList(
      writes,
      chain,
      assets[chain][symbol],
      prices[symbol].price,
      18,
      symbol,
      timestamp,
      "icETH",
      Math.min(...prices[symbol].confidences),
    );
  });

  async function fetchComponents(positions: any[]) {
    const components = positions
      .filter((p) => p != null)
      .flat()
      .map((p: any) => p.component);
    return await getTokenAndRedirectDataMap(components, chain, timestamp);
  }

  function calculatePricesFromPositions(positions: any[], componentData: any) {
    let prices: { [asset: string]: { price: number; confidences: number[] } } =
      {};
    positions.map((asset: any, i: number) => {
      if (asset == null) return;
      const symbol = Object.keys(assets[chain])[i];
      prices[symbol] = { price: 0, confidences: [] };
      asset.map((p: any) => {
        const tokenInfo = componentData[p.component.toLowerCase()];
        if (!tokenInfo) {
          prices[symbol].price = NaN;
          return;
        }

        prices[symbol].price +=
          (tokenInfo.price * p.unit) / 10 ** tokenInfo.decimals;

        prices[symbol].confidences.push(tokenInfo.confidence ?? 0.8);
      });
    });
    return prices;
  }

  return writes;
}

export async function indexCoop(timestamp: number): Promise<Write[][]> {
  return Promise.all(
    Object.keys(assets).map((chain) => getPrices(timestamp, chain)),
  );
}
