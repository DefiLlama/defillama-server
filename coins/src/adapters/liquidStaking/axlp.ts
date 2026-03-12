import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { getApi } from "../utils/sdk";

const contracts: { [chain: string]: { [key: string]: { symbol: string, token: string, stakingContract: string, rate: number } } } = {
    "arbitrum": {
        "amlp": {
            "symbol": "AMLP",
            "token": "0x152f5E6142db867f905a68617dBb6408D7993a4b",
            "stakingContract": "0x3a66b81be26f2d799C5A96A011e1E3FB2BA50999",
            "rate": 1.0
        },
        "ahlp": {
            "symbol": "AHLP",
            "token": "0x5fd22dA8315992dbbD82d5AC1087803ff134C2c4",
            "stakingContract": "0x1ba274EBbB07353657ed8C76A87ACf362E408D85",
            "rate": 1.0
        }
    }
}

export async function axlp(timestamp: number = 0) {
  const writes: Write[] = [];

  await Promise.all(
    Object.keys(contracts).map(async (chain) => {
      const { amlp, ahlp } = contracts[chain];
      const api = await getApi(chain, timestamp);
      const amlpPrice = await api.call({
        target: amlp.stakingContract,
        abi: "uint256:price",
      });

      addToDBWritesList(
        writes,
        chain,
        amlp.token,
        amlpPrice / 10 ** 18,
        18,
        amlp.symbol,
        timestamp,
        "amlp",
        1
      );

      const ahlpPrice = await api.call({
        target: ahlp.stakingContract,
        abi: "uint256:price",
      });

      addToDBWritesList(
        writes,
        chain,
        ahlp.token,
        ahlpPrice / 10 ** 18,
        18,
        ahlp.symbol,
        timestamp,
        "ahlp",
        ahlp.rate
      );
    })
  );

  return writes;
}