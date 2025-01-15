import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const _getTokensAbi = "function getDShares() external view returns (address[] memory, address[] memory)"
const _latestPriceAbi = "function latestFillPrice(address assetToken, address paymentToken) view returns (tuple(uint256 price, uint64 blocktime))"
const config: any = {
  arbitrum: {
    factory: "0xB4Ca72eA4d072C779254269FD56093D3ADf603b8",
    processor: "0xFA922457873F750244D93679df0d810881E4131D",
    quoteTokens: [
      "0xfc90518D5136585ba45e34ED5E1D108BD3950CFa",
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    ],
    usdplus: "0xfc90518D5136585ba45e34ED5E1D108BD3950CFa",
  },
  ethereum: {
    factory: "0x60B5E7eEcb2AEE0382db86491b8cFfA39347c747",
    processor: "0xA8a48C202AF4E73ad19513D37158A872A4ac79Cb",
    quoteTokens: [
      "0x98C6616F1CC0D3E938A16200830DD55663dd7DD3",
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    ],
    usdplus: "0x98C6616F1CC0D3E938A16200830DD55663dd7DD3",
  },
  blast: {
    factory: "0x6Aa1BDa7e764BC62589E64F371A4022B80B3c72a",
    processor: "0xA8a48C202AF4E73ad19513D37158A872A4ac79Cb",
    quoteTokens: [
      "0x4300000000000000000000000000000000000003",
    ],
  },
  kinto: {
    factory: "0xE4Daa69e99F48AD0C4D4843deF4447253248A906",
    processor: "0xa089dC07A4baFd941a4323a9078D2c24be8A747C",
    quoteTokens: [
      "0x6F086dB0f6A621a915bC90295175065c9e5d9b8c",
    ],
    usdplus: "0x6F086dB0f6A621a915bC90295175065c9e5d9b8c",
  },
  base: {
    factory: "0xBCE6410A175a1C9B1a25D38d7e1A900F8393BC4D",
    processor: "0x9A17bb2171469d0DFfE0C1a01Ff3Bdfc6A851e09",
    quoteTokens: [
      "0x98C6616F1CC0D3E938A16200830DD55663dd7DD3",
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    ],
    usdplus: "0x98C6616F1CC0D3E938A16200830DD55663dd7DD3",
  },
};

async function getTokenPrices(chain: string, timestamp: number, writes: Write[] = []): Promise<Write[]> {
  const api = await getApi(chain, timestamp);
  const { getTokensAbi = _getTokensAbi, latestPriceAbi = _latestPriceAbi, factory, processor, quoteTokens, usdplus } = config[chain];
  // dShares prices
  let [tokens] = await api.call({ target: factory, abi: getTokensAbi, })
  const supplies = await api.multiCall({  abi: 'erc20:totalSupply', calls: tokens})
  tokens = tokens.filter((_: any, idx: number) => +supplies[idx] > 0)
  const callParams = tokens.map((token: any) => quoteTokens.map((quoteToken: any) => ({ params: [token, quoteToken], }))).flat();
  const rawPrices = (await api.multiCall({
    abi: latestPriceAbi,
    target: processor,
    calls: callParams,
  }));
  const callsWithPrices = rawPrices.map((price: any, idx: number) => ({ blocktime: price.blocktime, price: price.price, token: callParams[idx].params[0], quoteToken: callParams[idx].params[1] }));
  const pricesByToken = callsWithPrices.reduce((acc: any, call: any) => {
    const token = call.token;
    if (!acc[token]) {
      acc[token] = [];
    }
    acc[token].push(call);
    return acc;
  }, {});
  const prices = tokens.map((token: any) => pricesByToken[token].reduce(
    (acc: any, call: any) => call.blocktime > acc.blocktime ? call : acc,
    { blocktime: 0, price: 0},
  )).map((p: any) => p.price / 1e18);

  // USD+
  if (usdplus) {
    tokens.push(usdplus);
    prices.push(1);
  }

  // convert to writes
  const pricesObject: any = {};
  tokens.forEach((contract: any, idx: number) => {
    pricesObject[contract] = { price: prices[idx] };
  });
  return getWrites({ chain, timestamp, pricesObject, projectName: "dinari", writes,})

}

export async function dinari(timestamp: number = 0): Promise<Write[]> {
  const writes: Write[] = [];
  for (const chain of Object.keys(config)) {
    await getTokenPrices(chain, timestamp, writes)
  }
  return writes;
}
