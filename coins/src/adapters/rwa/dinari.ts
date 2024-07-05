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
    quoteToken: "0xfc90518D5136585ba45e34ED5E1D108BD3950CFa",
    usdplus: "0xfc90518D5136585ba45e34ED5E1D108BD3950CFa",
  },
  ethereum: {
    factory: "0x60B5E7eEcb2AEE0382db86491b8cFfA39347c747",
    getTokensAbi:
      "function getDShares() external view returns (address[] memory, address[] memory)",
    processor: "0xA8a48C202AF4E73ad19513D37158A872A4ac79Cb",
    latestPriceAbi:
      "function latestFillPrice(address assetToken, address paymentToken) view returns (tuple(uint256 price, uint64 blocktime))",
    quoteToken: "0x98C6616F1CC0D3E938A16200830DD55663dd7DD3",
    usdplus: "0x98C6616F1CC0D3E938A16200830DD55663dd7DD3",
  },
  blast: {
    factory: "0x6Aa1BDa7e764BC62589E64F371A4022B80B3c72a",
    getTokensAbi:
      "function getDShares() external view returns (address[] memory, address[] memory)",
    processor: "0xA8a48C202AF4E73ad19513D37158A872A4ac79Cb",
    latestPriceAbi:
      "function latestFillPrice(address assetToken, address paymentToken) view returns (tuple(uint256 price, uint64 blocktime))",
      quoteToken: "0x4300000000000000000000000000000000000003",
    },
    kinto: {
      factory: "0xE4Daa69e99F48AD0C4D4843deF4447253248A906",
      getTokensAbi:
        "function getDShares() external view returns (address[] memory, address[] memory)",
      processor: "0xa089dC07A4baFd941a4323a9078D2c24be8A747C",
      latestPriceAbi:
        "function latestFillPrice(address assetToken, address paymentToken) view returns (tuple(uint256 price, uint64 blocktime))",
      quoteToken: "0x6F086dB0f6A621a915bC90295175065c9e5d9b8c",
      usdplus: "0x6F086dB0f6A621a915bC90295175065c9e5d9b8c",
    },
  };

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);

  // dShares prices
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
        params: [token, config[chain].quoteToken],
      })),
    })
  ).map((p: any) => p.price);

  // USD+
  const usdplus = config[chain].usdplus;
  if (usdplus) {
    tokens.push(usdplus);
    prices.push(1);
  }

  // convert to writes
  const pricesObject: any = {};
  tokens.forEach((contract: any, idx: number) => {
    pricesObject[contract] = { price: prices[idx] };
  });
  const writes: Write[] = [];
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

export async function dinari(timestamp: number = 0): Promise<Write[]> {
  const writes: Write[] = [];
  const arbWrites = await getTokenPrices("arbitrum", timestamp);
  const ethWrites = await getTokenPrices("ethereum", timestamp);
  const blastWrites = await getTokenPrices("blast", timestamp);
  writes.push(...arbWrites);
  writes.push(...ethWrites);
  writes.push(...blastWrites);
  return writes;
}
