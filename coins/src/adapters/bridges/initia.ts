import { fetch } from "../utils";

type Asset = {
  denom_units: {
    denom: string;
    exponent: number;
  }[];
  coingecko_id: string;
};

type Token = {
  from: string;
  to: string;
  decimals: number;
  symbol: string;
};

const chainIdMap: { [key: string]: string } = {
  echelon_initia: "echelon",
  yomi: "yominet",
  initia: "initia",
  embr: "embr",
  civitia: 'civitia', 
  inertia: 'inertia'
};

const url = (chain: string, rpc: boolean) =>
  `https://raw.githubusercontent.com/initia-labs/initia-registry/refs/heads/main/mainnets/${chain}/${
    rpc ? "chain" : "assetlist"
  }.json`;

async function bridge(chain: string): Promise<Token[]> {
  const partialTokens: Token[] = [];

  const queryChain: string = chainIdMap[chain] || chain;
  const res = (await fetch(url(queryChain, false))).assets as Asset[];
  const rpcData = (await fetch(url(queryChain, true))).apis.rest[0];
  const rpc: string = rpcData.address ?? rpcData;

  res.map(({ denom_units, coingecko_id }) => {
    const from = denom_units.find(({ exponent }) => exponent == 0)?.denom;
    const metadata = denom_units.find(({ exponent }) => exponent !== 0);
    if (!from || !metadata || !coingecko_id) return;

    partialTokens.push({
      from,
      to: `coingecko#${coingecko_id}`,
      decimals: metadata.exponent,
      symbol: metadata.denom,
    });
  });

  const tokens: Token[] = [];
  await Promise.all(
    partialTokens.map(async ({ from: partialFrom, to, decimals, symbol }) => {
      const from = await getLocalAddress(chain, rpc, partialFrom);
      if (!from) return;

      tokens.push({
        from,
        to,
        decimals,
        symbol,
      });
    }),
  );

  return tokens;
}

async function getLocalAddress(chain: string, rpc: string, address: string) {
  if (address.startsWith("evm/")) return `${chain}:0x${address.substring(4)}`;
  const query = `${rpc}/initia/move/v1/metadata?denom=${address.replace(
    "/",
    "%2F",
  )}`;
  const res = await fetch(query);
  return `${chain}:${res.metadata}`;
}

export default async function bridges() {
  const tokens: Token[] = [];

  await Promise.all(
    Object.keys(chainIdMap).map((chain) =>
      bridge(chain).then((t) => tokens.push(...t)),
    ),
  );

  return tokens;
}
