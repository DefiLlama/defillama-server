import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import getBlock from "../../utils/block";
import * as sdk from '@defillama/sdk'

export const config = {
  optimism: {
    vaults: [
      '0x8e2cdf8c6477439b7c989e86b917d80871b92339',
      '0x4d153f47f03c237f6360a6eccd185b4ae09c63d0',
    ],
    nativeVaults: [
      '0x7ee71053102d54fc843baebaf07277c2b6db64f1',
    ]
  },
  avax: {
    vaults: [
      '0xD795d70ec3C7b990ffED7a725a18Be5A9579c3b9',
      '0xb6767518b205ea8B312d2EF4d992A2a08C2f2416',
      '0xAf9f33df60CA764307B17E62dde86e9F7090426c',
      '0x808D5f0A62336917Da14fA9A10E9575B1040f71c',
    ],
    nativeVaults: [
      '0x1B156C5c75E9dF4CAAb2a5cc5999aC58ff4F9090',
    ]
  },
  fantom: {
    vaults: [
      '0xbf07093ccd6adfc3deb259c557b61e94c1f66945',
      '0x2a30C5e0d577108F694d2A96179cd73611Ee069b',
      '0xA3e3Af161943CfB3941B631676134bb048739727',
      '0xee3a7c885fd3cc5358ff583f2dab3b8bc473316f',
      '0x27c77411074ba90ca35e6f92a79dad577c05a746',
      '0xae94e96bf81b3a43027918b138b71a771d381150',
      '0x5d2EF803D6e255eF4D1c66762CBc8845051B54dB',
      '0xA4e2EE5a7fF51224c27C98098D8DB5C770bAAdbE',
      '0xD8dd2EA228968F7f043474Db610A20aF887866c7',
    ],
  },
  moonriver: {
    vaults: [
      '0x932009984bd2a7da8c6396694e811da5c0952d05',
    ],
  },
} as any

export default async function getTokenPrices(chain: string, timestamp: number) {
  const { vaults, nativeVaults = [] } = config[chain]
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);
  await Promise.all([
    getWrites(vaults, false),
    getWrites(nativeVaults, true),
  ])

  return writes

  async function getWrites(vaults: string[], isNative: boolean) {
    if (!vaults.length) return;

    const prices = await sdk.api2.abi.multiCall({
      abi: 'uint256:getPricePerFullShare',
      calls: vaults,
      chain, block,
    } as any)

    const underlyingTokens = await sdk.api2.abi.multiCall({
      abi: isNative ? 'address:native' : 'address:want',
      calls: vaults,
      chain, block,
    } as any)

    const tokenInfos = await getTokenInfo(chain, vaults, block)
    let coinsData: CoinData[] = await getTokenAndRedirectData(underlyingTokens, chain, timestamp);

    prices.map((output, i) => {
      const coinData: (CoinData | undefined) = coinsData.find(
        (c: CoinData) => c.address.toLowerCase() === underlyingTokens[i].toLowerCase()
      );
      if (!coinData || !output) return;
      const price = coinData.price * output / 1e18

      addToDBWritesList(writes, chain, vaults[i], price, tokenInfos.decimals[i].output, tokenInfos.symbols[i].output, timestamp, 'beefy', coinData.confidence as number)
    });

  }
}
