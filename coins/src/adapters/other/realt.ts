import axios from 'axios'

import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";

export default async function getTokenPrices(chain: 'ethereum' | 'xdai', timestamp: number) {
  const res = await axios.get<{
    symbol: string,
    tokenPrice: number,
    ethereumContract?: string,
    gnosisContract?: string,
  }[]>('https://api.realt.community/v1/token')

  const tokens = res.data.filter(x => chain === 'ethereum' ? x.ethereumContract !=  undefined : x.gnosisContract != undefined)

  const writes: Write[] = [];
  tokens.forEach(token => {
    addToDBWritesList(
      writes,
      chain,
      chain === 'ethereum' ? token.ethereumContract! : token.gnosisContract!,
      token.tokenPrice,
      18,
      token.symbol,
      timestamp,
      "realt",
      1,
      undefined,
    );
  })

  return writes;
}
