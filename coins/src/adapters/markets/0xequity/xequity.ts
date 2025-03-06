import { Write } from "../../utils/dbInterfaces";
import { addToDBWritesList } from "../../utils/database";
import { multiCall } from "@defillama/sdk/build/abi";

export const TOKENS: Record<
  string,
  { symbol: string; address: string; feed: string }[]
> = {
  arbitrum: [
    {
      symbol: "WXRWA1",
      address: "0x7804F92Eed47D42F0B00333aca56c1aD033Cd0dA",
      feed: "0xE397D5543eA2b01c866C4A65D109e762818CcDb2",
    },
  ],
  base: [
    {
      symbol: "WXRWA1",
      address: "0xce827d203dC317CB8823098DCbE88fD3aE447482",
      feed: "0xE397D5543eA2b01c866C4A65D109e762818CcDb2",
    },
  ],
  unit0: [
    {
      symbol: "WXRWA1",
      address: "0x1951a03830429D3f500b3bDd45432998dCFE5D65",
      feed: "0xE962B40B1e6EFA2ba1d43d68C889790360220514",
    },
  ],
};

export default async function getTokenPrices(chain: string, timestamp:number) {
  const tokens = TOKENS[chain] ?? [];
  const writes: Write[] = [];
  const prices = await getPrices(chain, tokens);

  for (let i = 0; i < tokens.length; i++) {
    const { symbol, address } = tokens[i];
    addToDBWritesList(
      writes,
      chain,
      address,
      prices[i],
      0,
      symbol,
      timestamp,
      '0xequity',
      1
    );
  }

  return writes;
}
async function getPrices(chain: string, tokenData: { feed: string; address: string }[]): Promise<number[]> {
  const calls = tokenData.map(({ feed, address }) => ({
    target: feed, params: [address]
  }));

  const { output } = await multiCall({ abi: chainLinkOracleGetPriceAbi, calls, chain });
  return output.map(({ output }: any) => output / 1e18);
}

const chainLinkOracleGetPriceAbi = {
  inputs: [{ internalType: "address", name: "tokenAddress", type: "address" }],
  name: "getTokenPrice",
  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
};
