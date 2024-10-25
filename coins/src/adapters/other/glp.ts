const abi = require("./abi.json");
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

type GLPContract = {
  glp: string;
  manager: string;
}

export const glpConfig: {
  [chain: string]: GLPContract[]
} = {
  arbitrum: [{ // GMX
    manager: "0x321f653eed006ad1c29d174e17d96351bde22649",
    glp: "0x4277f8f2c384827b5273592ff7cebd9f2c1ac258"
  }],
  avax: [{ // GMX
    manager: "0xe1ae4d4b06A5Fe1fc288f6B4CD72f9F8323B107F",
    glp: "0x01234181085565ed162a948b6a5e88758cd7c7b8"
  }],
  polygon: [{ // MVLP
    manager: "0x13e733ddd6725a8133bec31b2fc5994fa5c26ea9",
    glp: "0x9f4f8bc00f48663b7c204c96b932c29ccc43a2e8"
  }],
  mantle: [{ // klp
    manager: "0x3C4DE8fB37055500BB3D18eAE8dD0DffF527090e",
    glp: "0x92351C9Aed156Bc8Ec76D52cB1441b93f153e550"
  }],
  bsc: [{ // klp
    manager: "0xfE84703DF7E6F9A71e8d44c78ba24Ded1F631F30",
    glp: "0x98b799a29710738db188604c3C78BaC4B2bD4193"
  }],
}


export default function glp(timestamp: number = 0) {
  return Promise.all(Object.keys(glpConfig).map(chain => getTokenPrice(chain)));


  async function getTokenPrice(chain: string) {

    const api = await getApi(chain, timestamp)
    const managers = glpConfig[chain].map(i => i.manager);
    const glps = glpConfig[chain].map(i => i.glp);
    const [ aums, pricePrecisions, decimals, supplies] = await Promise.all([
      api.multiCall({ abi: abi.getAums, calls: managers, }),
      api.multiCall({ abi: abi.pricePrecision, calls: managers, }),
      api.multiCall({ abi: 'erc20:decimals', calls: glps, }),
      api.multiCall({ abi: 'erc20:totalSupply', calls: glps, }),
    ])
    const pricesObject: any = {}
    aums.forEach(([aum], i) => {
      pricesObject[glps[i]] = { price: aum * 10 ** decimals[i] / (supplies[i] * pricePrecisions[i]) }
    })
    return getWrites({ chain, timestamp, pricesObject, projectName: 'glp' })
  }
}
