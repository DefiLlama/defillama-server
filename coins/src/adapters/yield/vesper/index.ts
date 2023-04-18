import getYieldWrites from "../../utils/yieldTokens";
import fetch from "node-fetch";

const chainIdMap: { [id: number]: string } = { 1: "ethereum" };

type Res = {
  chainId: number;
  address: string;
};

export async function vesper(timestamp: number = 0) {
  console.log("starting vesper");
  const res: Res[] = await fetch(
    `https://api.vesper.finance/pools?stages=prod`,
  ).then((r) => r.json());

  const chainIds: number[] = [...new Set(res.map((p: any) => p.chainId))];

  return Promise.all(
    chainIds.map((id: number) => {
      const tokens = res
        .filter((p: any) => p.chainId == id)
        .map((p: any) => p.address);

      return getYieldWrites({
        chain: chainIdMap[id],
        timestamp,
        tokens,
        priceAbi: "uint256:pricePerShare",
        underlyingAbi: "address:token",
        projectName: "vesper",
      });
    }),
  );
}
