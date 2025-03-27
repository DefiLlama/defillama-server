import { Write, } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";
import { getConfig } from "../../../utils/cache";
import { getApi } from "../../utils/sdk";

export const config = {
  optimism: {
    wantVaults: [
      '0x8e2cdf8c6477439b7c989e86b917d80871b92339',
      '0x4d153f47f03c237f6360a6eccd185b4ae09c63d0',
      '0x0892a178c363b4739e5ac89e9155b9c30214c0c0',
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
      '0x8b92de822b121761a3caf894627a09a9f87864c0',
      '0xf723ae5478b1f03ca88c204f1ae5498d3576b78f',
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
    wantVaults: [
      '0xa0FdCDDA62C4C6a0109A702a7Efe59B4E8807e3f', // mooMvxMVLP
    ],
  },
  polygon_zkevm: {
    wantVaults: [
      '0x4Ebbf072288856dD7EBaE9CdEDd4f2Fd049523F7' // Yama QLP
    ]
  },
  arbitrum: {
    wantVaults: [
      '0x9dbbBaecACEDf53d5Caa295b8293c1def2055Adc', // mooGmxGLP
      '0x5b904f19fb9ccf493b623e5c8ce91603665788b0', // mooGmxGMX
      '0x9e75f8298e458b76382870982788988a0799195b', // mooCurveWSTETH
      '0xa64A8CAAd2c412baCf215A351FA60cDC2a08C0E8', // Yama PlvGLP
      '0xAACB2FD100981d15cFdEc2BB54B06C5E6f1AdB35', // Yama snrLLP
      '0xE48551b7a15e074810372B411e0526cdE45d4c02' // Yama staked JGLP
    ],
  },
  ethereum: {
    tokenVaults: [
      '0xbc10c4f7b9fe0b305e8639b04c536633a3db7065',
    ],
  },
  mantle: {},
  bsc: {},
  linea: {},
  xdai: {},
  base: {},
  era: {},
} as any

const beefyKeys = {
  polygon_zkevm: 'zkevm',
  xdai: 'gnosis',
  era: 'zksync',
} as any



export default async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const data = config[chain]
  const writes: Write[] = [];
  const beefyVaults = await getConfig('beefy', 'https://api.beefy.finance/vaults')
  const beefyKey = beefyKeys[chain] ?? chain
  data.wantVaults = data.wantVaults || []
  data.wantVaults.push(...beefyVaults.filter((i: any) => i.network === beefyKey && i.earnContractAddress).map((i: any) => i.earnContractAddress))

  await Promise.all(Object.entries(data).map(_getWrites))
  return writes

  async function _getWrites(params: any) {
    let [underlyingABIType, vaults] = params
    vaults = vaults.map((vault: any) => vault.toLowerCase())
    vaults = [...new Set(vaults)]
    if (!vaults.length) return;
    let underlyingABI: string

    switch (underlyingABIType) {
      case 'nativeVaults': underlyingABI = 'native'; break;
      case 'wantVaults': underlyingABI = 'want'; break;
      case 'tokenVaults': underlyingABI = 'token'; break;
      default: underlyingABI = 'underlying'; break;
    }

    const prices = await api.multiCall({
      abi: 'uint256:getPricePerFullShare',
      calls: vaults,
      permitFailure: true,
    } as any)

    const decimals = await api.multiCall({
      abi: 'uint8:decimals',
      calls: vaults,
      permitFailure: true,
    } as any)

    const underlyingTokens = await api.multiCall({
      abi: 'address:' + underlyingABI,
      calls: vaults,
      permitFailure: true,
    } as any)

    const pricesObject: any = {}
    vaults.forEach((vault: any, i: any) => {
      if (!prices[i] || !decimals[i] || !underlyingTokens[i]) return;
      pricesObject[vault] = { underlying: underlyingTokens[i], price: prices[i] / (10 ** decimals[i]) }
    })

    return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'beefy' })
  }
}
