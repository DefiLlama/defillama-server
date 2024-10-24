import { Token } from "./index";
import { getEventLogs } from "@defillama/sdk";
import { multiCall } from "@defillama/sdk/build/abi/abi2";

type MapData = { to: string; from: string; decimals?: number; symbol?: string };

export default async function bridge(): Promise<Token[]> {
  const logs = await getEventLogs({
    chain: `zircuit`,
    target: "0x4200000000000000000000000000000000000012",
    fromBlock: 379110,
    toBlock: 4498620,
    topics: [
      "0xceeb8e7d520d7f3b65fc11a262b91066940193b05d4f93df07cfdced0eb551cf",
    ],
    eventAbi: {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "remoteToken",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "localToken",
          type: "address",
        },
      ],
      name: "StandardL2TokenCreated",
      type: "event",
    },
  });

  const addresses: { from: string; to: string }[] = logs.map((log) => ({
    to: log.args[0],
    from: log.args[1],
  }));

  const [symbols, decimals] = await Promise.all([
    multiCall({
      chain: "zircuit",
      abi: "erc20:symbol",
      calls: addresses.map((d: MapData) => ({ target: d.from })),
    }),
    multiCall({
      chain: "zircuit",
      abi: "erc20:decimals",
      calls: addresses.map((d: MapData) => ({ target: d.from })),
    }),
  ]);

  const tokens: Token[] = addresses.map((a, i) => ({
    to: `ethereum:${a.to}`,
    from: `zircuit:${a.from}`,
    symbol: symbols[i],
    decimals: decimals[i],
  }));

  return tokens;
}
