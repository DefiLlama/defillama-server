import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";
// import contracts from "./contracts.json";
import abi from "./abi.json";

const contracts = [
  { oracle: "0x83Ec02059F686E747392A22ddfED7833bA0d7cE3", token: "0x2F123cF3F37CE3328CC9B5b8415f9EC5109b45e7", }, // bC3M
  { oracle: "0x32d1463eb53b73c095625719afa544d5426354cb", token: "0xCA30c93B02514f86d5C86a6e375E3A330B435Fb5", }, // b1B01
  { oracle: "0xd27e6d02b72eb6fce04ad5690c419196b4ef2885", token: "0x52d134c6DB5889FaD3542A09eAf7Aa90C0fdf9E4", }, // bIBTA
  { oracle: "0xf4e1b57fb228879d057ac5ae33973e8c53e4a0e0", token: "0x1e2c4fb7ede391d116e6b41cd0608260e8801d59", }, // bCSPX
  // { oracle: "0x32d1463eb53b73c095625719afa544d5426354cb", token: "0x20C64dEE8FdA5269A78f2D5BDBa861CA1d83DF7a", }, // bHIGH
]

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const pricesObject: any = {}
  const writes: Write[] = [];
  const latestAnswers = await api.multiCall({  abi: abi.latestAnswer, calls: contracts.map(c => c.oracle) })
  contracts.forEach((contract, i) => {
    pricesObject[contract.token] = { price: latestAnswers[i] / 1e8 }
  })

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'backed' })
}

export function backed(timestamp: number = 0) {
  console.log("starting backed");
  return getTokenPrices("ethereum", timestamp);
}
