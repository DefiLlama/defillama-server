import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";

const config: { [chain: string]: { [symbol: string]: string } } = {
  ethereum: {
    USK: "0x1B19C19393e2d034D8Ff31ff34c81252FcBbee92",
    EGK: "0xf2b5C482358dBaA495d442b57c163dbEDBF7868E"
  },
  polygon: {
    FRK: "0xbA11C5effA33c4D6F8f593CFA394241CfE925811",
  },
};

const abi = "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)";

export async function kuma(timestamp: number): Promise<Write[]> {
  console.log("starting kuma");
  const ethApi = await getApi("ethereum", timestamp);
  const polyApi = await getApi("polygon", timestamp);
  const prices: { [symbol: string]: number } = {
    USK:
      (await ethApi.call({
        abi,
        target: "0xdc888B8c76eF26852B6f6c0008D6E2f29A96Cb50",
      })).answer / 1e18,
    FRK: 
      (await polyApi.call({
        abi,
        target: "0x82C3e5Aa2B31a9bdCc9149FB8050464D2C77B4F0",
      })).answer / 1e18,
  };
  // KUMA tokens are redeemable for the bond NFT at any time, therefore their value can be assumed to be stable
  // the currently issued tokens in this list are all being held until the bond matures so there's no other way to price them
  const redirects: { [symbol: string]: string } = {
    EGK: 'coingecko#eurc'
  }

  const writes: Write[] = [];

  Object.keys(config).map((chain: string) =>
    Object.keys(config[chain]).map((symbol: string) => {
      const price = prices[symbol];
      const redirect = redirects[symbol];
      const address: string = config[chain][symbol];
      addToDBWritesList(
        writes,
        chain,
        address,
        price,
        18,
        symbol,
        timestamp,
        "kuma-protocol",
        0.8,
        redirect
      );
    }),
  );

  return writes;
}