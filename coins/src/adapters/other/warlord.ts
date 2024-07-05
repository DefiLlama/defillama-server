import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { ChainApi } from "@defillama/sdk";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";

const chain = "ethereum";
const projectName = "warlord";
const WAR_CONTROLLER = "0xFDeac9F9e4a5A7340Ac57B47C67d383fb4f13DBb";
const WAR_REDEEMER = "0x4787Ef084c1d57ED87D58a716d991F8A9CD3828C";
const WAR = "0xa8258deE2a677874a48F5320670A869D74f0cbC1";

async function getLockers(api: ChainApi): Promise<string[]> {
  let lockers = [];

  for (let i = 0; i != -1; ++i) {
    try {
      const output: string = await api.call({
        target: WAR_CONTROLLER,
        abi: "function lockers(uint256) view returns (address)",
        params: [i],
      });
      lockers.push(output);
    } catch (e) {
      break;
    }
  }

  return lockers;
}

export default async function getTokenPrice(timestamp: number) {
  const writes: Write[] = [];
  const api = await getApi(chain, timestamp);

  const lockers = await getLockers(api);

  const bals = await api.multiCall({
    abi: "uint256:getCurrentLockedTokens",
    calls: lockers.map((i) => ({ target: i })),
  });
  const tokens = await api.multiCall({
    abi: "address:token",
    calls: lockers.map((i) => ({ target: i })),
  });
  const tokensQueued = await api.multiCall({
    abi: "function queuedForWithdrawal(address) view returns (uint256)",
    calls: tokens.map((i) => ({ target: WAR_REDEEMER, params: [i] })),
  });

  const [totalSupply, decimals, symbol] = await Promise.all([
    await api.call({ target: WAR, abi: "erc20:totalSupply" }),
    await api.call({ target: WAR, abi: "erc20:decimals" }),
    await api.call({ target: WAR, abi: "erc20:symbol" }),
  ]);

  const coinData = await getTokenAndRedirectData(tokens, chain, timestamp);

  const price: number =
    tokens
      .map((token, i) => {
        const tokenInfo = getTokenInfo(token);
        const tokenPrice = tokenInfo!.price;
        const tokenDecimals = tokenInfo!.decimals;
        const tokenBal = bals[i];
        const tokensQueuedForWithdrawal = tokensQueued[i];
        return (
          ((tokenBal - tokensQueuedForWithdrawal) / 10 ** tokenDecimals) *
          tokenPrice
        );
      })
      .reduce((sum, current) => sum + current, 0) /
    (totalSupply / 10 ** decimals);

  addToDBWritesList(
    writes,
    chain,
    WAR,
    price,
    decimals,
    symbol,
    timestamp,
    projectName,
    0.99,
  );

  function getTokenInfo(token: string) {
    token = token.toLowerCase();
    return coinData.find((i) => i.address.toLowerCase() === token);
  }
  return writes;
}
