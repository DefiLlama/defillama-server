import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";
import abi from "./abi.json";

const oracles: any = [
  { key: "bCSPX", oracle: "0xf4e1b57fb228879d057ac5ae33973e8c53e4a0e0", chain: 'ethereum', ethToken: '0x1e2c4fb7ede391d116e6b41cd0608260e8801d59'},
  { key: "bCOIN", oracle: "0x19c7e267554b5dde46dc5f2d6b23b94bd6cc512b", chain: 'arbitrum', ethToken: '0xbbcb0356bB9e6B3Faa5CbF9E5F36185d53403Ac9'},
  { key: "bNIU", oracle: "0xcded6a54af652fe5986a3db5e6bc3313ebba64db", chain: 'arbitrum', ethToken: '0x2f11eeee0bf21e7661a22dbbbb9068f4ad191b86'},
  { key: "bIB01", oracle: "0x32d1463eb53b73c095625719afa544d5426354cb", chain: 'ethereum', ethToken: '0xCA30c93B02514f86d5C86a6e375E3A330B435Fb5'},
  { key: "bIBTA", oracle: "0xd27e6d02b72eb6fce04ad5690c419196b4ef2885", chain: 'ethereum', ethToken: '0x52d134c6DB5889FaD3542A09eAf7Aa90C0fdf9E4'},
  { key: "bHIGH", oracle: "0xf99c06c6911c8fcb81af40bbf6bfc9401a7c6e03", chain: 'arbitrum', ethToken: '0x20C64dEE8FdA5269A78f2D5BDBa861CA1d83DF7a'},
  { key: "bC3M", oracle: "0xc5f37a3538fc5599d35d1a84381c1693df8ed3bb", chain: 'arbitrum', ethToken: '0x2F123cF3F37CE3328CC9B5b8415f9EC5109b45e7'},
  { key: "bERNA", oracle: "0x0f5e11591c64163f04a448403dd59d6849ee4f0c", chain: 'arbitrum', ethToken: '0x0f76D32CDccDcbd602A55Af23EAF58FD1eE17245'},
]

async function getTokenPrices(chain: string, timestamp: number) {
  const ethApi = await getApi('ethereum', timestamp)
  const arbiApi = await getApi('arbitrum', timestamp)
  const ethOracles = oracles.filter((o: any) => o.chain === 'ethereum')
  const arbiOracles = oracles.filter((o: any) => o.chain === 'arbitrum')
  const ethPrices = await ethApi.multiCall({  abi: abi.latestAnswer, calls: ethOracles.map((o: any) => o.oracle) })
  const arbiPrices = await arbiApi.multiCall({  abi: abi.latestAnswer, calls: arbiOracles.map((o: any) => o.oracle) })
  ethOracles.forEach((oracle: any, i: any) => oracle.price = ethPrices[i] / 1e8)
  arbiOracles.forEach((oracle: any, i: any) => oracle.price = arbiPrices[i] / 1e8)
  const pricesObject: any = {}
  const writes: Write[] = [];
  oracles.forEach((contract: any) => {
    pricesObject[contract.ethToken] = { price: contract.price }
  })

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'backed' })
}

export function backed(timestamp: number = 0) {
  console.log("starting backed");
  return getTokenPrices("ethereum", timestamp);
}
