import { ChainApi } from "@defillama/sdk";
import { getLogs } from "../../../utils/cache/getLogs";
import { CoinData, Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import PromisePool from "@supercharge/promise-pool";
import { wrappedGasTokens } from "../../utils/gasTokens";
import { nullAddress } from "../../../utils/shared/constants";

const customMapping: { [chain: string]: { [from: string]: string } } = {
  arbitrum: {
    "0x35fa164735182de50811e8e2e824cfb9b6118ac2":
      "0x35751007a407ca6feffe80b3cb397736d2cf4dbe",
  },
};
const gasMapping: { [chain: string]: string[] } = {
  bsc: [
    "0xeda1d0e1681d59dea451702963d6287b844cb94c",
    "0x0921ccc98956b1599003fd9739d5e66bf319a161",
  ],
  optimism: ["0x0c485feb9e6fee816652ea8f3bed2a8f59296e40"],
  arbitrum: [
    "0x279b44e48226d40ec389129061cb0b56c5c09e46",
    "0x6ae79089b2cf4be441480801bb741a531d94312b",
    "0x1d38d4204159aa5e767afba8f76be22117de61e5",
    "0xed99fc8bdb8e9e7b8240f62f69609a125a0fbf14",
    "0x14fbc760efaf36781cb0eb3cb255ad976117b9bd",
    "0xcb471665bf23b2ac6196d84d947490fd5571215f",
    "0x816f59ffa2239fd7106f94eabdc0a9547a892f2f",
    "0x3e4e3291ed667fb4dee680d19e5702ef8275493d",
    "0x6f02c88650837c8dfe89f66723c4743e9cf833cd",
    "0x952083cde7aaa11ab8449057f7de23a970aa8472",
  ],
  ethereum: [
    "0xa9355a5d306c67027c54de0e5a72df76befa5694",
    "0x6b4740722e46048874d84306b2877600abcea3ae",
    "0x4f43c77872db6ba177c270986cd30c3381af37ee",
    "0x2801b56f6ccc8046ae29e86c0fce556e046122e2",
    "0xde715330043799d7a80249660d1e6b61eb3713b3",
    "0x445d25a1c31445fb29e65d12da8e0eea38174176",
    "0x38100a480dbed278b0fe57ba80a75498a7dc5bb1",
    "0xd8f12bcde578c653014f27379a6114f67f0e445f",
    "0xcdbd5ff3e03b6828db9c32e2131a60aba5137901",
    "0x1e0c2e41f3165ff6b8a660092f63e10bc0eebe26",
    "0xa54fc268101c8b97de19ef3141d34751a11996b2",
    "0xbae2df4dfcd0c613018d6056a40077f2d1eff28a",
    "0x99184849e35d91dd85f50993bbb03a42fc0a6fe7",
    "0xee6bdfac6767efef0879b924fea12a3437d281a2",
    "0x038c1b03dab3b891afbca4371ec807edaa3e6eb6",
    "0x0e1c5509b503358ea1dac119c1d413e28cc4b303",
    "0xff262396f2a35cd7aa24b7255e7d3f45f057cdba",
    "0xa5fd0e8991be631917d2d2b2d5dacfd7bfef7876",
    "0xa1073303f32de052643faff61d90858e33b4e033",
    "0x6010676bc2534652ad1ef5fa8073dcf9ad7ebfbe",
    "0x84a50177a84dad50fdbf665dfbfb39914b52dff2",
    "0x676106576004ef54b4bd39ce8d2b34069f86eb8f",
    "0x7c7fbb2d11803c35aa3e283985237ad27f64406b",
    "0xc211b207e3324cf9c501d6f3fb77ffd77a3c82c9",
    "0xfd482179ddee989c45eab19991852f80ff31457a",
    "0xbe8549a20257917a0a9ef8911daf18190a8842a4",
    "0xbba9baaa6b3107182147a12177e0f1ec46b8b072",
    "0x58612beb0e8a126735b19bb222cbc7fc2c162d2a",
    "0xfd5cf95e8b886ace955057ca4dc69466e793fbbe",
    "0x1729981345aa5cacdc19ea9eeffea90cf1c6e28b",
    "0xbce250b572955c044c0c4e75b2fa8016c12cabf9",
    "0x17be998a578fd97687b24e83954fec86dc20c979",
    "0xf7906f274c174a52d444175729e3fa98f9bde285",
    "0xcba3b226ca62e666042cb4a1e6e4681053885f75",
    "0x9e612ff1902c5feea4fd69eb236375d5299e0ffc",
    "0x46e6b4a950eb1abba159517dea956afd01ea9497",
  ],
  sonic: ["0x3aef1d372d0a7a7e482f465bc14a42d78f920392"],
};

const blacklist = ["0x1d83fdf6f019d0a6b2babc3c6c208224952e42fc"];

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

  const unfilteredMarkets: string[] = logs
    .map((l: any) => l.market)
    .filter((m: string) => !blacklist.includes(m.toLowerCase()));

  if (chain == "berachain")
    unfilteredMarkets.push(
      ...[
        "0xd8079e0929d67390067529974b116212903cac69",
        "0x0651c3f8ba59e312529d9a92fcebd8bb159cbaed",
        "0xbfc42d9cb3358603e4804ac9ab54159fd5a85098",
        "0x227d4a2e5734b500fa0bed940e4df54bdda25636",
        "0x31ed9f16c7bbc26ae3404b14abc68adc7611b1a6",
        "0xd8f42a92a0e2995eee9aed66d630de00a9b49e22",
      ],
    );
  else if (chain == "arbitrum")
    unfilteredMarkets.push(
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
  else if (chain == "ethereum")
    unfilteredMarkets.push(
      ...[
        "0x1729981345aa5cacdc19ea9eeffea90cf1c6e28b",
        "0xbce250b572955c044c0c4e75b2fa8016c12cabf9",
        "0x17be998a578fd97687b24e83954fec86dc20c979",
        "0xb4460e76d99ecad95030204d3c25fb33c4833997",
        "0x8f7627bd46b30e296aa3aabe1df9bfac10920b6e",
        "0x6010676bc2534652ad1ef5fa8073dcf9ad7ebfbe",
        "0x00b321D89A8C36B3929f20B7955080baeD706D1B",
        "0x7e0f3511044AFdaD9B4fd5C7Fa327cBeB90BEeBf",
        "0x1c48cd1179aa0c503a48fcd5852559942492e31b",
        "0x36d3ca43ae7939645c306e26603ce16e39a89192",
        "0x98ffefd1a51d322c8def6d0ba183e71547216f7f",
        "0xafdc922d0059147486cc1f0f32e3a2354b0d35cc",
        "0xafdc922d0059147486cc1f0f32e3a2354b0d35cc",
        "0x98ffefd1a51d322c8def6d0ba183e71547216f7f",
        "0x048680f64d6dff1748ba6d9a01f578433787e24b",
        "0x64506968e80c9ed07bff60c8d9d57474effff2c9",
        "0x22a72b0c504cbb7f8245208f84d8f035c311adec",
        "0x81f3a11db1de16f4f9ba8bf46b71d2b168c64899",
        "0xcba3b226ca62e666042cb4a1e6e4681053885f75",
        "0x523f9441853467477b4dde653c554942f8e17162",
        "0x9e612ff1902c5feea4fd69eb236375d5299e0ffc",
        "0x3b621df9b429ed1ad64428ea7d8d142374c45121",
        "0x905a5a4792a0c27a2adb2777f98c577d320079ef",
        "0x00b321d89a8c36b3929f20b7955080baed706d1b",
        "0x40789e8536c668c6a249af61c81b9dfac3eb8f32",
        "0x67ec4046800bc2c27a51528e9d382d43c3146d29",
        "0x409b499780ac04dc4780f9b79fbede665ac773d5",
        "0x1c48cd1179aa0c503a48fcd5852559942492e31b",
        "0x36d3ca43ae7939645c306e26603ce16e39a89192",
        "0x792b9ede7a18c26b814f87eb5e0c8d26ad189780",
      ],
    );
  else if (chain == "bsc")
    unfilteredMarkets.push(
      ...[
        "0x9daa2878a8739e66e08e7ad35316c5143c0ea7c7",
        "0x080f52a881ba96eee2268682733c857c560e5dd4",
      ],
    );

  const unfilteredTokens: string[][] = await api.multiCall({
    calls: unfilteredMarkets,
    abi: "function readTokens() view returns (address _SY, address _PT, address _YT)",
  });

  const unfilteredSYs: string[] = unfilteredTokens.map((t: any) =>
    t._SY.toLowerCase(),
  );
  const unfilteredYieldTokens: string[] = await api.multiCall({
    abi: "function yieldToken() view returns (address )",
    calls: unfilteredSYs,
    permitFailure: true,
  });

  const markets: string[] = [];
  const SYs: string[] = [];
  const yieldTokens: string[] = [];
  const tokens: string[][] = [];
  unfilteredYieldTokens.map((y: string | undefined, i: number) => {
    if (!y) return;
    yieldTokens.push(y.toLowerCase());
    SYs.push(unfilteredSYs[i]);
    tokens.push(unfilteredTokens[i]);
    markets.push(unfilteredMarkets[i]);
  });

  const PTs: string[] = tokens.map((t: any) => t._PT.toLowerCase());

  const underlyingTokensMap: { [sy: string]: string } = {};
  await PromisePool.withConcurrency(10)
    .for(SYs)
    .process(async (target) => {
      const res: any = await api.call({
        abi: "function assetInfo() view returns (uint8 assetType, address assetAddress, uint8 assetDecimals)",
        target,
      });
      underlyingTokensMap[target] = res.assetAddress.toLowerCase();
    });
  let underlyingTokens: string[] = [];
  SYs.map((sy) => underlyingTokens.push(underlyingTokensMap[sy]));

  let underlyingTokenDataArray: CoinData[] = await getTokenAndRedirectData(
    [
      ...new Set(
        [
          ...yieldTokens,
          ...underlyingTokens,
          chain in wrappedGasTokens ? wrappedGasTokens[chain] : null,
        ].filter((t) => t != null),
      ),
    ],
    chain,
    timestamp,
  );

  if (chain == "arbitrum")
    underlyingTokenDataArray.push(
      ...(await getTokenAndRedirectData(
        [
          "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
          "0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7",
          ...Object.keys(customMapping[chain]),
        ],
        "ethereum",
        timestamp,
      )),
    );

  if (chain in gasMapping) {
    underlyingTokens = markets.map((m: string, i: number) =>
      gasMapping[chain].includes(m.toLowerCase())
        ? wrappedGasTokens[chain]
        : underlyingTokens[i],
    );
  }

  if (chain in customMapping) {
    underlyingTokens = underlyingTokens.map((t: string) =>
      t in customMapping[chain] ? customMapping[chain][t] : t,
    );
    underlyingTokenDataArray = underlyingTokenDataArray.filter(
      (u: CoinData) => !(u.address in customMapping[chain]),
    );
  }

  const underlyingTokenData: { [key: string]: CoinData } = {};
  underlyingTokenDataArray.map((u: CoinData) => {
    underlyingTokenData[u.address] = u;
  });

  async function syWrites() {
    const [decimals, symbols] = await Promise.all([
      api.multiCall({ abi: "uint8:decimals", calls: SYs }),
      api.multiCall({ abi: "string:symbol", calls: SYs }),
    ]);

    SYs.map((SY: string, i: number) => {
      const underlying: CoinData | undefined =
        underlyingTokenData[yieldTokens[i]];

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
      if (underlyingTokens[i] == nullAddress) {
        console.log(`${chain}  \t ${symbols[i]} \t ${markets[i]}`);
        return;
      }
      const underlying: CoinData | undefined =
        underlyingTokenData[underlyingTokens[i]];

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
      if (underlyingTokens[i] == nullAddress) return;

      const underlying: CoinData | undefined =
        underlyingTokenData[underlyingTokens[i]];
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
    const exchangeRates: { [address: string]: any } = {};
    const [decimals, symbols] = await Promise.all([
      api.multiCall({
        abi: "erc20:decimals",
        calls: markets,
      }),
      api.multiCall({
        abi: "erc20:symbol",
        calls: markets,
      }),
      Promise.all(
        // PromisePool error when multicalled on mainnet
        markets.map((m: string) =>
          api
            .call({
              target: toAsset,
              params: [m, 1800],
              abi: "function getLpToAssetRate(address, uint32) public view returns (uint256 ptToAssetRate)",
            })
            .then((r) => (exchangeRates[m] = r))
            .catch(() =>
              api
                .call({
                  target: toAsset,
                  params: [m, 900],
                  abi: "function getLpToAssetRate(address, uint32) public view returns (uint256 ptToAssetRate)",
                })
                .then((r) => (exchangeRates[m] = r))
                .catch(() => (exchangeRates[m] = null)),
            ),
        ),
      ),
    ]);

    markets.map((m: string, i: number) => {
      if (!m || !PTs[i] || !SYs[i]) return;
      const underlying: CoinData | undefined =
        underlyingTokenData[yieldTokens[i]] ??
        underlyingTokenData[underlyingTokens[i]];

      if (
        !underlying ||
        !exchangeRates[m] ||
        !decimals[i] ||
        !symbols[i] ||
        underlying.address == nullAddress
      )
        return;

      const customDecimals: { [SY: string]: number } = {
        "0xec30e55b51d9518cfcf5e870bcf89c73f5708f72": 8,
        "0xd5cf704dc17403343965b4f9cd4d7b5e9b20cc52": 8,
      };

      const price =
        (underlying.price * exchangeRates[m]) /
        10 **
          (SYs[i] in customDecimals
            ? customDecimals[SYs[i]]
            : underlying.decimals);

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

  await Promise.all([syWrites(), ptWrites(), lpWrites()]);
  await ytWrites();

  return writes;
}
