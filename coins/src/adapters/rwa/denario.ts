import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const DSC = '0x5d4e735784293a0a8d37761ad93c13a0dd35c7e7'
const DGC = '0xf7e2d612f1a0ce09ce9fc6fc0b59c7fd5b75042f'

const priceOracle = '0x9be09fa9205e8f6b200d3c71a958ac146913662e'
const priceOracleAbi = 'function getValue(string query) view returns (uint256)'

const silverPriceParams = '/silvercoin/latest/usd'
const goldPriceParams = '/goldcoin/latest/usd'

async function getTokenPrices(chain: string, timestamp: number, writes: Write[]) {

  const tokenAPI = await getApi(chain, timestamp)
  const tokens = await getTokenList()
  const prices = await getTokenPrice(tokens)
  const pricesObject: any = {}

  tokens.forEach((token: any, index: number) => {
    pricesObject[token] = { price: prices[index] / 1e18 }
  })

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'denario' })

  async function getTokenList() {
    return [
      DSC,
      // DGC // Uncomment when gold price is available
    ];
  }

  async function getTokenPrice(tokens: string[]) {
    return tokenAPI.multiCall({
      abi: priceOracleAbi,
      calls: [
        silverPriceParams,
        // goldPriceParams // Uncomment when gold price is available
      ],
      target: priceOracle
    })
  }

}

export async function denario(timestamp: number = 0) {
  const writes: Write[] = [];
  await getTokenPrices("polygon", timestamp ,writes);
  return writes;
}
