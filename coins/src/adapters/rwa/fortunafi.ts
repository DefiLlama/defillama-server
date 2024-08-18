import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const config: any = {
  canto: {
    fbill: '0x79ECCE8E2D17603877Ff15BC29804CbCB590EC08',
    fCOIN: '0x855EA9979189383ef5A85eB74Ed3a02E2604EA81',
    ifBill: '0x45bafad5a6a531Bc18Cf6CE5B02C58eA4D20589b',
  },
  arbitrum: {
    fbill: '0x79ECCE8E2D17603877Ff15BC29804CbCB590EC08',
    fCOIN: '0x108Ec61bd5A91F5596F824832524C6b6002E3F03',
    ifBill: '0x45bafad5a6a531Bc18Cf6CE5B02C58eA4D20589b',
  },
  blast: {
    fbill: '0x79ECCE8E2D17603877Ff15BC29804CbCB590EC08',
    fCOIN: '0xE85Ae7e8Fa0Ee69426019b7D3E77843673807ABE',
    ifBill: '0x45bafad5a6a531Bc18Cf6CE5B02C58eA4D20589b',
  },
  ethereum: {
    fCOIN: '0x2378aC4EEAAe44695E1e3d0fcAEEd6ba8b0F5108',
  },
}

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  let tokens = Object.values(config[chain]) as any
  const supplies = await api.multiCall({ abi: 'uint256:totalSupply', calls: tokens })
  const nav = await api.multiCall({ abi: 'uint256:nav', calls: tokens })
  const decimals = await api.multiCall({ abi: 'uint8:decimals', calls: tokens })
  const pricesObject: any = {};
  tokens.forEach((contract: any, idx: number) => {
    if (!+supplies[idx] || !+nav[idx]) return;
    const price = nav[idx] / (supplies[idx] / 10 ** (decimals[idx] - 18))
    if (isNaN(price)) return;
    pricesObject[contract] = { price };
  });

  return getWrites({ chain, timestamp, pricesObject, projectName: "fortunafi", })
}

export function fortunafi(timestamp: number = 0) {
  return Promise.all(Object.keys(config).map(i => getTokenPrices(i, timestamp)))
}
