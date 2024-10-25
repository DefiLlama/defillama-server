

import { Write } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";
import { getApi } from "../../utils/sdk";

const config: any = {
  bsc: {
    oracle: '0x4e9651AD369d8F986935852C945338F76b5fb360',
    tokens: {
      GFST: '0xbA2e788D83eA786d11ED87353763616157A35082',
      STBX: '0x65DaD60a28626309F7504d853AFF0099FeD1aAaF',
      SLX: '0x2C4A911B16435f96e6bD18E4d720a32480554a22',
      LSRWA: '0x475eD67Bfc62B41c048b81310337c1D75D45aADd',
    }
  },
  polygon: {
    oracle: '0x4e9651AD369d8F986935852C945338F76b5fb360',
    tokens: {
      CSB23: '0x76381bFCCB35736a854675570c07a73508622AFd',
      MFRET: '0xAa6d73C22A953a6A83B9963052bA73f0C53FC764',
      MRDTS: '0xF71272DBC0Da11aDd09cd44A0b7F7D384C0D5Fe1',
      CTREAL: '0x06c3aa74645f424d24f6C835e8D606D35225Ab96',
    }
  },
}

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  let { oracle, tokens } = config[chain]
  tokens = Object.values(tokens)
  const tokenInfo = await api.multiCall({
    abi: 'function getCoinPrice(uint256, address, address)external view returns (bool, uint256)',
    target: oracle,
    calls: tokens.map((token: string) => ({ params: [840, token, '0x0000000000000000000000000000000000000000',] })),
  })
  const pricesObject: any = {};
  const writes: Write[] = [];
  tokens.forEach((contract: any, idx: number) => {
    pricesObject[contract] = { price: tokenInfo[idx][1] / 1e18 };
  });

  await getWrites({ chain, timestamp, writes, pricesObject, projectName: "stobox", })
  return writes;
}

export function stobox(timestamp: number = 0) {
  return Promise.all(Object.keys(config).map(i => getTokenPrices(i, timestamp)))
}
