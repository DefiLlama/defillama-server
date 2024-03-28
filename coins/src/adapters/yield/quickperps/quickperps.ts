import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";

export const config: any = {
  polygon_zkevm: {
    qlpManager: "0x87BcD3914eD3dcd5886BA1c0f0DA25150b56fE54",
    tokens: {
      QLP: "0x973ae30Cb49986E1D3BdCAB4d40B96fEA5baBE84",
      fsQLP: "0x42d36bA59E1d3DCc96365948Df794e0054e5Fd4d",
      fQLP: "0xd3Ee28CB8ed02a5641DFA02624dF399b01f1e131",
    },
  },
};

export async function getTokenPrices(timestamp: number, chain: string) {
  const writes: Write[] = [];
  const api = await getApi(chain, timestamp, true);
  const { qlpManager, tokens } = config[chain];
  const price =
    (await api.call({
      abi: "function getPrice(bool) view returns (uint256)",
      target: qlpManager,
      params: [0],
    })) / 1e30;

  Object.keys(tokens).map((symbol: string) =>
    addToDBWritesList(
      writes,
      chain,
      tokens[symbol],
      price,
      18,
      symbol,
      timestamp,
      "quickperps",
      0.9,
    ),
  );

  return writes;
}
