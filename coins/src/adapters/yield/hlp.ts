import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

async function getTokenPrices(chain: string, timestamp: number) {
  // logic taken from vaultka: https://github.com/DefiLlama/DefiLlama-Adapters/pull/7633/files
  const api = await getApi(chain, timestamp)
  const rum = '0x739fe1BE8CbBeaeA96fEA55c4052Cd87796c0a89'
  const hlp = '0x4307fbDCD9Ec7AEA5a1c2958deCaa6f316952bAb'
  const priceAbi = "function getHLPPrice(bool maximize) public view returns (uint256)"
  const hlpPrice = await api.call({ target: rum, abi: priceAbi, params: true as any })
  const pricesObject: any = {
    [hlp]: { price: hlpPrice / 1e12 }
  }
  const writes: Write[] = [];
  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'hlp' })
}

export function hlp(timestamp: number = 0) {
  console.log("starting hlp");
  return getTokenPrices("arbitrum", timestamp);
}
