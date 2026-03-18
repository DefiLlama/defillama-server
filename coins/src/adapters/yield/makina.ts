import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const config: { [chain: string]: string[] } = {
  ethereum: Object.values({
    "DBIT": "0x972966bcc17f7d818de4f27dc146ef539c231bdf",
    "DETH": "0x871ab8e36cae9af35c6a3488b049965233deb7ed",
    "DUSD": "0x1e33e98af620f1d563fcd3cfd3c75ace841204ef",
  }),
}

export async function makina(timestamp: number) {
  return Promise.all(
    Object.keys(config).map((k: string) => getTokenPrices(timestamp, k)),
  );
}

async function getTokenPrices(timestamp: number, chain: string) {
  const api = await getApi(chain, timestamp);
  const tokens = config[chain]
  const minters = await api.multiCall({ abi: "address:minter", calls: tokens, })
  const supplies = await api.multiCall({ abi: 'erc20:totalSupply', calls: tokens })
  const decimals = await api.multiCall({ abi: 'erc20:decimals', calls: tokens })
  const aums = await api.multiCall({ abi: "uint256:lastTotalAum", calls: minters, })
  const uTokens = await api.multiCall({ abi: "address:accountingToken", calls: minters, })
  const uDecimals = await api.multiCall({ abi: 'erc20:decimals', calls: uTokens })

  const pricesObject: any = {};
  tokens.forEach((t, i) => {
    const price = (aums[i] / (10 ** uDecimals[i])) / (supplies[i] / (10 ** decimals[i]))

    pricesObject[t] = { price, underlying: uTokens[i], }
  })
  return getWrites({ chain, timestamp, pricesObject, projectName: "makina", confidence: 1 });
}