import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";

const config: { [chain: string]: { [symbol: string]: string } } = {
  ethereum: {
    USK: "0x01bf66becdcfd6d59a5ca18869f494fea086cdfd",
    EGK: "0xf2b5c482358dbaa495d442b57c163dbedbf7868e"
  },
  polygon: {
    FRK: "0x2cb7285733a30bb08303b917a7a519c88146c6eb",
  },
  linea: {
    USK: "0x7a6aa80b49017f3e091574ab5c6977d863ff3865"
  }
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
      })).answer / 1e8,
    FRK: 
      (await polyApi.call({
        abi,
        target: "0x82C3e5Aa2B31a9bdCc9149FB8050464D2C77B4F0",
      })).answer / 1e8,
  };
  // KUMA tokens are redeemable for the bond NFT at any time, therefore their value can be assumed to be stable
  // the currently issued tokens in this list are all being held until the bond matures so there's no other way to price them
  const redirects: { [symbol: string]: string } = {
    EGK: 'coingecko#euro-coin'
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