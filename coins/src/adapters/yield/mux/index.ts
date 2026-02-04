import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import axios from "axios";

/*//////////////////////////////////////////////////////////////////////////////
                                   Constants                                             
//////////////////////////////////////////////////////////////////////////////*/

const MUXLP_ADDRESSES: Record<string, string> = {
  arbitrum: "0x7CbaF5a14D953fF896E5B3312031515c858737C8",
  avax: "0xAf2D365e668bAaFEdcFd256c0FBbe519e594E390",
  bsc: "0x07145Ad7C7351c6FE86b6B841fC9Bed74eb475A7",
  fantom: "0xDDAde9a8dA4851960DFcff1AE4A18EE75C39eDD2",
  optimism: "0x0509474f102b5cd3f1f09e1E91feb25938eF0f17",
};

/*//////////////////////////////////////////////////////////////////////////////
                                    Helpers                                            
//////////////////////////////////////////////////////////////////////////////*/

async function fetchFromMuxAPI() {
  try {
    const response = await axios.get(
      "https://app.mux.network/api/liquidityAsset"
    );
    const { muxLPPrice } = response.data;
    return parseFloat(muxLPPrice);
  } catch (err) {
    return undefined;
  }
}

/*//////////////////////////////////////////////////////////////////////////////
                                      Main                                          
//////////////////////////////////////////////////////////////////////////////*/

export function mux(timestamp: number = 0) {
  return Promise.all(
    Object.keys(MUXLP_ADDRESSES).map((c) => getTokenPrices(c, timestamp))
  );
}

async function getTokenPrices(
  chain: string,
  timestamp: number
): Promise<Write[]> {
  const writes: Write[] = [];
  const token: string = MUXLP_ADDRESSES[chain];
  const price: number | undefined = await fetchFromMuxAPI();
  const decimals: number = 18;
  const symbol: string = "MUXLP";
  const adapter: string = "mux-protocol";
  const confidence: number = 1;

  addToDBWritesList(
    writes,
    chain,
    token,
    price,
    decimals,
    symbol,
    timestamp,
    adapter,
    confidence
  );

  return writes;
}
