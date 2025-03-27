import fetch from "node-fetch";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { Token } from "./index";
import { nullAddress } from "../../utils/shared/constants";

const chain = "sophon";

export default async function (): Promise<Token[]> {
  const {
    data: { items },
  } = await fetch(
    `https://api.covalenthq.com/v1/1/address/0xD7f9f54194C633F36CCD5F3da84ad4a1c38cB2cB/balances_v2/?&key=${process.env.COVALENT_KEY}`,
  ).then((r) => r.json());

  let l1Assets: Token[] = items.map((i: any) => ({
    to: `ethereum:${i.contract_address}`,
    decimals: i.contract_decimals,
    symbol: i.contract_ticker_symbol,
  }));

  const l2Assets = await multiCall({
    calls: l1Assets.map(({ to }) => ({
      target: "0x954ba8223a6BFEC1Cc3867139243A02BA0Bc66e4",
      params: to.substring(to.indexOf(":") + 1),
    })),
    abi: "function l2TokenAddress(address _l1Token) external view returns (address)",
    chain,
    permitFailure: true,
  });

  l2Assets.map((a: any, i: number) => {
    if (a == nullAddress) {
      l1Assets.splice(i, 1);
      return;
    }
    l1Assets[i].from = `sophon:${a}`;
  });

  return l1Assets;
}
