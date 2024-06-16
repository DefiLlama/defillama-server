import { getCurrentUnixTimestamp } from "../../utils/date";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import { getApi } from "../utils/sdk";

const now = getCurrentUnixTimestamp();

const pools: string[] = [
  "0x764c40df756058250fa5478115e667fcef7e72e0",
  "0xDFA33A77ce4420bf4cA7bFa9c1a57A40307a092e",
  "0xBD867dd8b357a067A075c54Eb0E9324ef9592C3d",
  "0xc117238434fe8AD8a8302C19A10d0470E0Dd3A09",
  "0x6c85A831a945BA9b565d500a3a9e107A0AAd868E",
  "0xD736A3947860F2d7ac316a12085755001F360775",
  "0xcc2daecb9a96eedd2d48259d664d5d48791a7f79"
];

export async function bitcow(timestamp: number) {
  const writes: Write[] = [];
  const chain = "btr";

  const api = await getApi(chain, timestamp == 0 ? now : timestamp);

  const [tokens, xTokens, yTokens] = await Promise.all([
    api.multiCall({
      abi: "function lpToken() view returns (address)",
      calls: pools.map((target: string) => ({ target })),
    }),
    api.multiCall({
      abi: "function xToken() view returns (address)",
      calls: pools.map((target: string) => ({ target })),
    }),
    api.multiCall({
      abi: "function yToken() view returns (address)",
      calls: pools.map((target: string) => ({ target })),
    }),
  ]);

  const [xBalance, yBalance, lpInfo, underlyingInfo] = await Promise.all([
    api.multiCall({
      abi: "erc20:balanceOf",
      calls: xTokens.map((target: string, i: number) => ({
        target,
        params: pools[i],
      })),
    }),
    api.multiCall({
      abi: "erc20:balanceOf",
      calls: yTokens.map((target: string, i: number) => ({
        target,
        params: pools[i],
      })),
    }),
    getTokenInfo(chain, tokens, undefined, { withSupply: true }),
    getTokenAndRedirectData(
      [...new Set([...xTokens, ...yTokens])],
      chain,
      timestamp,
    ),
  ]);

  function underlyingTokenValue(
    i: number,
    isXToken: boolean,
  ): number | undefined {
    const tokens: string[] = isXToken ? xTokens : yTokens;
    const info = underlyingInfo.find(
      (t: any) => t.address == tokens[i].toLowerCase(),
    );
    if (!info) return undefined;
    const balances = isXToken ? xBalance : yBalance;
    return (info.price * balances[i]) / 10 ** info.decimals;
  }

  tokens.forEach((t, i) => {
    const xValue = underlyingTokenValue(i, true);
    const yValue = underlyingTokenValue(i, false);
    if (!xValue || !yValue) return;

    const realSupply =
      lpInfo.supplies[i].output / 10 ** lpInfo.decimals[i].output;
    const price = (Number(xValue) + Number(yValue)) / realSupply;

    addToDBWritesList(
      writes,
      chain,
      t,
      price,
      lpInfo.decimals[i].output,
      lpInfo.symbols[i].output,
      timestamp,
      "bitcow",
      0.9,
    );
  });

  return writes;
}
