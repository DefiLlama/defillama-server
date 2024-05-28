import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const config: any = {
  arbitrum: {
    factory: "0xB4Ca72eA4d072C779254269FD56093D3ADf603b8",
    getTokensAbi:
      "function getDShares() external view returns (address[] memory, address[] memory)",
    processor: "0xFA922457873F750244D93679df0d810881E4131D",
    latestPriceAbi:
      "function latestFillPrice(address assetToken, address paymentToken) view returns (tuple(uint256 price, uint64 blocktime))",
    usdplus: "0xfc90518D5136585ba45e34ED5E1D108BD3950CFa",
  },
};

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  const tokens = (
    await api.call({
      chain: chain,
      target: config[chain].factory,
      abi: config[chain].getTokensAbi,
    })
  )[0];
  const prices = (
    await api.multiCall({
      abi: config[chain].latestPriceAbi,
      calls: tokens.map((token: any) => ({
        target: config[chain].processor,
        params: [token, config[chain].usdplus],
      })),
    })
  ).map((p: any) => p.price);
  const pricesObject: any = {};
  const writes: Write[] = [];
  tokens.forEach((contract: any, idx: number) => {
    pricesObject[contract] = { price: prices[idx] };
  });

  writes.push(
    ...(await getWrites({
      chain,
      timestamp,
      writes,
      pricesObject,
      projectName: "dinari",
    })),
  );

  return writes;
}

export function dinari(timestamp: number = 0) {
  return getTokenPrices("arbitrum", timestamp);
}
