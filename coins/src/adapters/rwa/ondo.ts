import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";

const config: { [chain: string]: { [symbol: string]: string } } = {
  ethereum: {
    OUSG: "0x1B19C19393e2d034D8Ff31ff34c81252FcBbee92",
    USDYc: "0xe86845788d6e3e5c2393ade1a051ae617d974c09",
    USDY: "0x96F6eF951840721AdBF46Ac996b59E0235CB985C",
  },
  polygon: {
    OUSG: "0xbA11C5effA33c4D6F8f593CFA394241CfE925811",
  },
};

export async function ondo(timestamp: number): Promise<Write[]> {
  console.log("starting ondo");
  const ethApi = await getApi("ethereum", timestamp);
  const tokenPrices: { [address: string]: number } = {
    OUSG:
      (await ethApi.call({
        abi: "uint256:rwaPrice",
        target: "0xc53e6824480d976180A65415c19A6931D17265BA",
      })) / 1e18,
    USDYc: 
      (await ethApi.call({
        abi: "uint256:getPrice",
        target: "0xa0219aa5b31e65bc920b5b6dfb8edf0988121de0",
      })) / 1e18,
    USDY:
      (await ethApi.call({
        abi: "uint256:getPrice",
        target: "0xa0219aa5b31e65bc920b5b6dfb8edf0988121de0",
      })) / 1e18,
  };

  const writes: Write[] = [];

  Object.keys(config).map((chain: string) =>
    Object.keys(config[chain]).map((symbol: string) => {
      const price: number = tokenPrices[symbol];
      const address: string = config[chain][symbol];
      addToDBWritesList(
        writes,
        chain,
        address,
        price,
        18,
        symbol,
        timestamp,
        "ondo-rwa",
        0.8,
      );
    }),
  );

  return writes;
}
