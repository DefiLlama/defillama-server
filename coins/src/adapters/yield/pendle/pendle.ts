import { ChainApi } from "@defillama/sdk";
import { getLogs } from "../../../utils/cache/getLogs";
import { CoinData, Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";

const customMapping: { [chain: string]: { [key: string]: string } } = {
  arbitrum: {
    "0x0000000000000000000000000000000000000000":
      "0xa1290d69c65a6fe4df752f95823fae25cb99e5a7",
    "0x35fa164735182de50811e8e2e824cfb9b6118ac2":
      "0x35751007a407ca6feffe80b3cb397736d2cf4dbe",
  },
};
const blacklist = [
  "0x1d83fdf6f019d0a6b2babc3c6c208224952e42fc",
  "0xcb71c2a73fd7588e1599df90b88de2316585a860",
];

export default async function getTokenPrices(
  timestamp: number,
  chain: string,
  config: any,
): Promise<Write[]> {
  const writes: Write[] = [];
  const { factories, toAsset } = config;
  const api: ChainApi = await getApi(chain, timestamp);
  const logs: any[][] = [];

  await Promise.all(
    factories.map(async (f: any) => {
      const { factory: target, fromBlock, toBlock, eventAbi, topics } = f;
      const factoryLogs: any[][] = await newMarkets();
      logs.push(...factoryLogs);

      async function newMarkets() {
        return await getLogs({
          api,
          target,
          topics,
          eventAbi,
          onlyArgs: true,
          fromBlock,
          toBlock,
        });
      }
    }),
  );

  const markets: string[] = logs
    .map((l: any) => l.market)
    .filter((m: string) => !blacklist.includes(m.toLowerCase()));

  if (chain == "arbitrum")
    markets.push(
      ...[
        "0xe11f9786b06438456b044b3e21712228adcaa0d1",
        "0x6f02c88650837c8dfe89f66723c4743e9cf833cd",
        "0xb7ffe52ea584d2169ae66e7f0423574a5e15056f",
        "0xaccd9a7cb5518326bed715f90bd32cdf2fec2d14",
        "0x99e9028e274feafa2e1d8787e1ee6de39c6f7724",
        "0x60712e3c9136cf411c561b4e948d4d26637561e7",
        "0xba4a858d664ddb052158168db04afa3cff5cfcc8",
      ],
    );
  if (chain == "ethereum")
    markets.push(
      ...[
        "0x1729981345aa5cacdc19ea9eeffea90cf1c6e28b",
        "0xbce250b572955c044c0c4e75b2fa8016c12cabf9",
        "0x17be998a578fd97687b24e83954fec86dc20c979",
        "0xb4460e76d99ecad95030204d3c25fb33c4833997",
        "0x8f7627bd46b30e296aa3aabe1df9bfac10920b6e",
      ],
    );
  const tokens: string[][] = await api.multiCall({
    calls: markets,
    abi: "function readTokens() view returns (address _SY, address _PT, address _YT)",
  });

  const SYs: string[] = tokens.map((t: any) => t._SY.toLowerCase());
  const PTs: string[] = tokens.map((t: any) => t._PT.toLowerCase());
  const yieldTokens: string[] = (
    await api.multiCall({
      abi: "function yieldToken() view returns (address )",
      calls: SYs,
    })
  ).map((i: any) => i.toLowerCase());
  let underlyingTokens: string[] = (
    await api.multiCall({
      abi: "function assetInfo() view returns (uint8 asseetType, address assetAddress, uint8 assetDecimals)",
      calls: SYs,
    })
  ).map((i: any) => i.assetAddress.toLowerCase());

  let underlyingTokenData: CoinData[] = await getTokenAndRedirectData(
    [...new Set([...yieldTokens, ...underlyingTokens])],
    chain,
    timestamp,
  );

  if (chain == "arbitrum")
    underlyingTokenData.push(
      ...(await getTokenAndRedirectData(
        [
          "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
          "0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7",
        ],
        "ethereum",
        timestamp,
      )),
    );

  if (chain in customMapping) {
    underlyingTokens = underlyingTokens.map((t: string) =>
      t in customMapping[chain] ? customMapping[chain][t] : t,
    );
    underlyingTokenData = underlyingTokenData.filter(
      (u: CoinData) => !(u.address in customMapping[chain]),
    );
  }

  async function syWrites() {
    const [decimals, symbols] = await Promise.all([
      api.multiCall({ abi: "uint8:decimals", calls: SYs }),
      api.multiCall({ abi: "string:symbol", calls: SYs }),
    ]);

    SYs.map((SY: string, i: number) => {
      const underlying: CoinData | undefined = underlyingTokenData.find(
        (u: CoinData) => u.address == yieldTokens[i],
      );

      const redirect: string =
        underlying && underlying.redirect
          ? underlying.redirect
          : `asset#${chain}:${yieldTokens[i]}`;

      addToDBWritesList(
        writes,
        chain,
        SY,
        undefined,
        decimals[i],
        symbols[i],
        timestamp,
        "pendle-sy",
        1,
        redirect,
      );
    });
  }

  async function ptWrites() {
    const exchangeRates: { [address: string]: any } = {};
    const [decimals, symbols] = await Promise.all([
      api.multiCall({
        abi: "uint8:decimals",
        calls: PTs,
      }),
      api.multiCall({
        abi: "string:symbol",
        calls: PTs,
      }),
      Promise.all(
        // PromisePool error when multicalled on mainnet
        markets.map((m: string) =>
          api
            .call({
              target: toAsset,
              params: [m, 1800],
              abi: "function getPtToAssetRate(address, uint32) public view returns (uint256 ptToAssetRate)",
            })
            .then((r) => (exchangeRates[m] = r))
            .catch(() =>
              api
                .call({
                  target: toAsset,
                  params: [m, 900],
                  abi: "function getPtToAssetRate(address, uint32) public view returns (uint256 ptToAssetRate)",
                })
                .then((r) => (exchangeRates[m] = r))
                .catch(() => (exchangeRates[m] = null)),
            ),
        ),
      ),
    ]);

    PTs.map((PT: string, i: number) => {
      const underlying: CoinData | undefined = underlyingTokenData.find(
        (u: CoinData) => u.address == underlyingTokens[i],
      );

      if (
        !underlying ||
        !exchangeRates[markets[i]] ||
        !decimals[i] ||
        !symbols[i]
      )
        return;

      const price = (underlying.price * exchangeRates[markets[i]]) / 10 ** 18;

      addToDBWritesList(
        writes,
        chain,
        PT,
        price,
        decimals[i],
        symbols[i],
        timestamp,
        "pendle-pt",
        1,
      );
    });
  }

  async function ytWrites() {
    const YTs: string[] = tokens.map((t: any) => t._YT);

    const [decimals, symbols] = await Promise.all([
      api.multiCall({
        abi: "uint8:decimals",
        calls: YTs,
      }),
      api.multiCall({
        abi: "string:symbol",
        calls: YTs,
      }),
    ]);

    YTs.map((YT: string, i: number) => {
      const underlying: CoinData | undefined = underlyingTokenData.find(
        (u: CoinData) => u.address == underlyingTokens[i],
      );
      const PT: Write | undefined = writes.find((u: Write) =>
        u.PK.includes(PTs[i]),
      );

      if (!underlying || !PT || !decimals[i] || !symbols[i] || !PT.price)
        return;

      const price = underlying.price - PT.price;

      addToDBWritesList(
        writes,
        chain,
        YT,
        price,
        decimals[i],
        symbols[i],
        timestamp,
        "pendle-yt",
        1,
      );
    });
  }

  async function lpWrites() {
    const [ptBalances, syBalances, supplies, decimals, symbols] =
      await Promise.all([
        api.multiCall({
          abi: "erc20:balanceOf",
          calls: markets.map((m: string, i: number) => ({
            target: PTs[i],
            params: m,
          })),
        }),
        api.multiCall({
          abi: "erc20:balanceOf",
          calls: markets.map((m: string, i: number) => ({
            target: SYs[i],
            params: m,
          })),
        }),
        api.multiCall({
          abi: "erc20:totalSupply",
          calls: markets,
        }),
        api.multiCall({
          abi: "erc20:decimals",
          calls: markets,
        }),
        api.multiCall({
          abi: "erc20:symbol",
          calls: markets,
        }),
      ]);

    markets.map((m: string, i: number) => {
      if (!m || !PTs[i] || !SYs[i]) return;
      const underlying: CoinData | undefined = underlyingTokenData.find(
        (u: CoinData) =>
          u.address == yieldTokens[i] || u.address == underlyingTokens[i],
      );
      const PT: Write | undefined = writes.find(
        (u: Write) => u.PK.includes(PTs[i]) && u.SK == 0,
      );

      if (!PT || !underlying || !PT.price || !PT.decimals) return;

      const price: number =
        ((ptBalances[i] * PT.price) / 10 ** PT.decimals +
          (syBalances[i] * underlying.price) / 10 ** underlying.decimals) /
        (supplies[i] / 10 ** decimals[i]);

      if (isNaN(price)) return;

      addToDBWritesList(
        writes,
        chain,
        m,
        price,
        decimals[i],
        symbols[i],
        timestamp,
        "pendle-lp",
        1,
      );
    });
  }

  await Promise.all([syWrites(), ptWrites()]);
  await Promise.all([ytWrites(), lpWrites()]);

  return writes;
}
