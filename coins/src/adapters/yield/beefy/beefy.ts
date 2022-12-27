import { Write, } from "../../utils/dbInterfaces";
import getBlock from "../../utils/block";
import getWrites from "../../utils/getWrites";
import * as sdk from '@defillama/sdk'

export const config = {
  optimism: {
    wantVaults: [
      '0x8e2cdf8c6477439b7c989e86b917d80871b92339',
      '0x4d153f47f03c237f6360a6eccd185b4ae09c63d0',
    ],
    nativeVaults: [
      '0x7ee71053102d54fc843baebaf07277c2b6db64f1',
    ]
  },
  avax: {
    wantVaults: [
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
    wantVaults: [
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
    wantVaults: [
      '0x932009984bd2a7da8c6396694e811da5c0952d05',
    ],
  },
  polygon: {
    vaults: [
      '0xf52b3250e026e0307d7d717ae0f331baaa4f83a8', // Tetu DAI
      '0x6c5e2e7df0372f834b7f40d16ff4333cf49af235', // Tetu Link
    ],
    tokenVaults: [
      '0x7d60f21072b585351dfd5e8b17109458d97ec120',
    ],
  },
  ethereum: {
    tokenVaults: [
      '0xbc10c4f7b9fe0b305e8639b04c536633a3db7065',
    ],
  }
} as any

export default async function getTokenPrices(chain: string, timestamp: number) {
  const data = config[chain]
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);
  await Promise.all(Object.entries(data).map(_getWrites))

  return writes

  async function _getWrites(params: any) {
    const [underlyingABIType, vaults] = params
    if (!vaults.length) return;
    let underlyingABI: string

    switch(underlyingABIType) {
      case 'nativeVaults': underlyingABI = 'native'; break; 
      case 'wantVaults': underlyingABI = 'want'; break; 
      case 'tokenVaults': underlyingABI = 'token'; break; 
      default: underlyingABI = 'underlying'; break; 
    }

    const prices = await sdk.api2.abi.multiCall({
      abi: 'uint256:getPricePerFullShare',
      calls: vaults,
      chain, block,
    } as any)

    const decimals = await sdk.api2.abi.multiCall({
      abi: 'uint8:decimals',
      calls: vaults,
      chain, block,
    } as any)

    const underlyingTokens = await sdk.api2.abi.multiCall({
      abi: 'address:' + underlyingABI,
      calls: vaults,
      chain, block,
    } as any)

    const pricesObject: any = {}
    vaults.forEach((vault: any, i: any) => {
      pricesObject[vault] = { underlying: underlyingTokens[i], price: prices[i] / (10 ** decimals[i]) }
    })

    return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'beefy' })
  }
}
