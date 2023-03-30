const abi = require("./abi.json");
const contracts = require("./contracts.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import { getGasTokenBalance } from "../../utils/gasTokens";
import { Result, Multicall, MultiCallResults } from "../../utils/sdkInterfaces";
import { getTokenInfo, listUnknownTokens } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { BigNumber } from "ethers";
import { requery } from "../../utils/sdk";
interface TokenIndexes {
  known: number[];
  unknown: number[];
}
const registryIds = {
  stableswap: 0,
  stableFactory: 3,
  crypto: 5,
  cryptoFactory: 6,
};
async function getPcsPools(chain: any, block: number | undefined) {
  const target: string = "0x36bBb126e75351C0DfB651e39b38fe0BC436FFD2";
  const poolCount: Result = (
    await call({
      chain,
      target,
      abi: abi.pairLength,
      block,
    })
  ).output;

  const pools: any = {};
  pools["pcs"] = (
    await multiCall({
      calls: [...Array(Number(poolCount)).keys()].map((n) => ({
        target,
        params: [n],
      })),
      chain,
      abi: abi.swapPairContract,
      block,
    })
  ).output;

  return pools;
}
async function getPools(
  chain: any,
  block: number | undefined,
  name: string | undefined,
) {
  if (name == "pcs") return await getPcsPools(chain, block);
  const registries: string[] =
    chain == "bsc"
      ? [
          "0x266bb386252347b03c7b6eb37f950f476d7c3e63",
          "0x0000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000",
          "0x41871a4c63d8fae4855848cd1790ed237454a5c4",
        ]
      : (
          await multiCall({
            chain,
            calls: Object.values(registryIds).map((r: number) => ({
              params: r,
              target: contracts[chain].addressProvider,
            })),
            abi: abi.get_id_info,
            block,
          })
        ).output.map((r: any) => r.output.addr);

  const poolCounts: Result[] = (
    await multiCall({
      chain,
      calls: registries.map((r: string) => ({
        target: r,
      })),
      abi: abi.pool_count,
      block,
    })
  ).output;

  const pools: any = {};
  for (let i = 0; i < Object.values(registryIds).length; i++) {
    pools[Object.keys(registryIds)[i]] = (
      await multiCall({
        calls: [...Array(Number(poolCounts[i].output)).keys()].map((n) => ({
          target: poolCounts[i].input.target,
          params: [n],
        })),
        chain,
        abi: abi.pool_list,
        block,
      })
    ).output;
  }

  return pools;
}
function mapGaugeTokenBalances(calls: Multicall[], chain: any) {
  const mapping: any = {
    "0x7f90122bf0700f9e7e1f688fe926940e8839f353": {
      to: "0xbF7E49483881C76487b0989CD7d9A8239B20CA41",
      pools: [],
      chains: ["arbitrum"],
    },
    "0x27e611fd27b276acbd5ffd632e5eaebec9761e40": {
      to: "0x8866414733F22295b7563f9C5299715D2D76CAf4",
      pools: [],
      chains: ["fantom"],
    },
    "0xd02a30d33153877bc20e5721ee53dedee0422b2f": {
      to: "0xd4f94d0aaa640bbb72b5eec2d85f6d114d81a88e",
      pools: [],
      chains: ["fantom"],
    },
  };

  return calls.map(function (c) {
    let token = c.target.toLowerCase();
    let owner = c.params[0].toLowerCase();
    if (
      mapping[token] &&
      (mapping[token].pools.includes(owner) ||
        mapping[token].chains.includes(chain))
    ) {
      token = mapping[token].to;
    }
    return { target: token, params: [owner] };
  });
}
function aggregateBalanceCalls(coins: string[], nCoins: string[], pool: any) {
  let calls: Multicall[] = [];
  [...Array(Number(nCoins[0])).keys()].map((n) =>
    calls.push({ target: coins[n], params: [pool.output] }),
  );
  return calls;
}
async function pcsPoolBalances(
  chain: any,
  pool: any,
  registry: string,
  block: number | undefined,
) {
  const nCoins: string = (
    await call({
      target: pool.output,
      chain,
      abi: abi.get_n_coins[registry],
      block,
    })
  ).output;

  const coins: string[] = (
    await multiCall({
      calls: [...Array(Number(nCoins)).keys()].map((n) => ({
        target: pool.output,
        params: [n],
      })),
      chain,
      abi: abi.get_coins[registry],
      block,
    })
  ).output.map((c: Result) => c.output);

  let calls: Multicall[] = aggregateBalanceCalls(coins, [nCoins], pool);

  let balances: Result[] = (
    await multiCall({
      calls: calls as any,
      chain,
      abi: "erc20:balanceOf",
      block,
    })
  ).output;

  return await getGasTokenBalance(chain, pool.output, balances, block);
}
async function poolBalances(
  chain: any,
  pool: any,
  registry: string,
  block: number | undefined,
) {
  let nCoins;
  const coins = (
    await call({
      target: pool.input.target,
      params: [pool.output],
      chain,
      abi: abi.get_coins[registry],
      block,
    })
  ).output;

  try {
    nCoins = (
      await call({
        target: pool.input.target,
        params: [pool.output],
        chain,
        abi: abi.get_n_coins[registry],
        block,
      })
    ).output;
    if (nCoins == "0") {
      nCoins = (
        await call({
          target: pool.input.target,
          params: [pool.output],
          chain,
          abi: abi.get_meta_n_coins[registry],
          block,
        })
      ).output[0];
    }
  } catch {
    nCoins = [coins.length];
  }

  let calls: Multicall[] = aggregateBalanceCalls(coins, nCoins, pool);
  calls = mapGaugeTokenBalances(calls, chain);
  let balances: Result[] = (
    await multiCall({
      calls: calls as any,
      chain,
      abi: "erc20:balanceOf",
      block,
    })
  ).output;

  return await getGasTokenBalance(chain, pool.output, balances, block);
}
async function PoolToToken(chain: any, pool: any, block: number | undefined) {
  pool = pool.output.toLowerCase();
  let token: string;

  const faultyPools: string[] = [
    "0x5633e00994896d0f472926050ecb32e38bef3e65",
    "0xd0c855c092dbc41055a40297420bba0a6f46f8ad",
  ];
  if (faultyPools.includes(pool)) {
    throw new Error(`pool at ${pool} is faulty some how`);
  }

  try {
    token = (
      await call({
        target: pool,
        abi: abi.lp_token,
        chain,
        block,
      })
    ).output.toLowerCase();
  } catch {
    try {
      token = (
        await call({
          target: pool,
          abi: abi.token,
          chain,
          block,
        })
      ).output.toLowerCase();
    } catch {
      const mapping: { [key: string]: any } = {
        // pool contract : token contract
        "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7":
          "0x6c3f90f043a72fa612cbac8115ee7e52bde6e490",
        "0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27":
          "0x3b3ac5386837dc563660fb6a0937dfaa5924333b",
        "0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56":
          "0x845838df265dcd2c412a1dc9e959c7d08537f8a2",
        "0x4ca9b3063ec5866a4b82e437059d2c43d1be596f":
          "0xb19059ebb43466c323583928285a49f558e572fd",
        "0x06364f10b501e868329afbc005b3492902d6c763":
          "0xd905e2eaebe188fc92179b6350807d8bd91db0d8",
        "0x93054188d876f558f4a66b2ef1d97d16edf0895b":
          "0x49849c98ae39fff122806c06791fa73784fb3675",
        "0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714":
          "0x075b1bb99792c9e1041ba13afef80c91a1e70fb3",
        "0xc5424b857f758e906013f3555dad202e4bdb4567":
          "0xa3d87fffce63b53e0d54faa1cc983b7eb0b74a9c",
        "0xa5407eae9ba41422680e2e00537571bcc53efbfd":
          "0xc25a3a3b969415c80451098fa907ec722572917f",
        "0x52ea46506b9cc5ef470c5bf89f17dc28bb35d85c":
          "0x9fc689ccada600b6df723d9e47d84d76664a1f23",
        "0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51":
          "0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8",
        "0x8038c01a0390a8c547446a0b2c18fc9aefecc10c":
          "0x3a664ab939fd8482048609f652f9a0b0677337b9",
        "0x4f062658eaaf2c1ccf8c8e36d6824cdf41167956":
          "0xd2967f45c4f384deea880f807be904762a3dea07",
        "0x3ef6a01a0f81d6046290f3e2a8c5b843e738e604":
          "0x5b5cfe992adac0c9d48e05854b2d91c73a003858",
        "0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171":
          "0x6d65b498cb23deaba52db31c93da9bffb340fb8f",
        "0x8474ddbe98f5aa3179b3b3f5942d724afcdec9f6":
          "0x1aef73d49dedc4b1778d0706583995958dc862e6",
        "0xc18cc39da8b11da8c3541c598ee022258f9744da":
          "0xc2ee6b0334c261ed60c72f6054450b61b8f18e35",
        "0x3e01dd8a5e1fb3481f0f589056b428fc308af0fb":
          "0x97e2768e8e73511ca874545dc5ff8067eb19b787",
        "0x0f9cb53ebe405d49a0bbdbd291a65ff571bc83e1":
          "0x4f3e8f405cf5afc05d68142f3783bdfe13811522",
        "0x890f4e345b1daed0367a877a1612f86a1f86985f":
          "0x94e131324b6054c0d789b190b2dac504e4361b53",
        "0x071c661b4deefb59e2a3ddb20db036821eee8f4b":
          "0x410e3e86ef427e30b9235497143881f717d93c2a",
        "0xd81da8d904b52208541bade1bd6595d8a251f8dd":
          "0x2fe94ea3d5d4a175184081439753de15aef9d614",
        "0x7f55dde206dbad629c080068923b36fe9d6bdbef":
          "0xde5331ac4b3630f94853ff322b66407e0d6331e8",
        "0xc25099792e9349c7dd09759744ea681c7de2cb66":
          "0x64eda51d3ad40d56b9dfc5554e06f94e1dd786fd",
        "0x80466c64868e1ab14a1ddf27a676c3fcbe638fe5":
          "0xca3d75ac011bf5ad07a98d02f18225f9bd9a6bdf",
        "0xd51a44d3fae010294c616388b506acda1bfaae46":
          "0xc4ad29ba4b3c580e6d59105fff484999997675ff",
        "0x9838eccc42659fa8aa7daf2ad134b53984c9427b":
          "0x3b6831c0077a1e44ed0a21841c3bc4dc11bce833",
        "0x98a7f18d4e56cfe84e3d081b40001b3d5bd3eb8b":
          "0x3d229e1b4faab62f621ef2f6a610961f7bd7b23b",
        "0x8301ae4fc9c624d1d396cbdaa1ed877821d7c511":
          "0xed4064f376cb8d68f770fb1ff088a3d0f3ff5c4d",
        "0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4":
          "0x3a283d9c08e8b55966afb64c515f5143cf907611",
        "0xadcfcf9894335dc340f6cd182afa45999f45fc44":
          "0x8484673ca7bff40f82b041916881aea15ee84834",
        "0x98638facf9a3865cd033f36548713183f6996122":
          "0x8282bd15dca2ea2bdf24163e8f2781b30c43a2ef",
        "0x752ebeb79963cf0732e9c0fec72a49fd1defaeac":
          "0xcb08717451aae9ef950a2524e33b6dcaba60147b",
        "0xe84f5b1582ba325fdf9ce6b0c1f087ccfc924e54":
          "0x70fc957eb90e37af82acdbd12675699797745f68",
        "0x3a1659ddcf2339be3aea159ca010979fb49155ff":
          "0x58e57ca18b7a47112b877e31929798cd3d703b0f",
        "0x960ea3e3c7fb317332d990873d354e18d7645590":
          "0x8e0b8c8bb9db49a46697f3a5bb8a308e744821d2",
        "0xa827a652ead76c6b0b3d19dba05452e06e25c27e":
          "0x3dfe1324a0ee9d86337d06aeb829deb4528db9ca",
        "0xb755b949c126c04e0348dd881a5cf55d424742b2":
          "0x1dab6560494b04473a0be3e7d83cf3fdf3a51828",
      };
      token = mapping[pool] ? mapping[pool] : pool;
    }
  }
  return token;
}
async function getUnderlyingPrices(
  balances: any,
  chain: any,
  timestamp: number,
  unknownTokensList: any[],
) {
  const coinsData: CoinData[] = await getTokenAndRedirectData(
    balances.map((r: Result) => r.input.target.toLowerCase()),
    chain,
    timestamp,
    4,
  );

  const poolComponents = balances.map((b: any) => {
    try {
      let coinData: CoinData | undefined = coinsData.find(
        (c: CoinData) => c.address == b.input.target.toLowerCase(),
      );
      if (coinData == undefined) throw new Error(`no coin data found`);
      return {
        balance: b.output / 10 ** coinData.decimals,
        price: coinData.price,
        decimals: coinData.decimals,
        confidence: coinData.confidence,
      };
    } catch {
      unknownTokensList.push(b.input.target.toLowerCase());
    }
  });

  return poolComponents;
}
async function unknownPools(
  chain: any,
  block: number | undefined,
  timestamp: number,
  poolList: any,
  registries: string[],
  writes: Write[],
  unknownPoolList: any[],
  unknownTokensList: any[],
) {
  for (let registry of registries) {
    for (let pool of Object.values(poolList[registry])) {
      try {
        const token: string = await PoolToToken(chain, pool, block);
        // THIS IS GOOD FOR DEBUG
        // if (
        //   ![
        //     "0xa1f8a6807c402e4a15ef4eba36528a3fed24e577",
        //     "0xf43211935c781d5ca1a41d2041f397b8a7366c7a"
        //   ].includes(token.toLowerCase())
        // )
        //   continue;

        const [balances, tokenInfo] = await Promise.all([
          registry == "pcs"
            ? pcsPoolBalances(chain, pool, registry, block)
            : poolBalances(chain, pool, registry, block),
          getTokenInfo(chain, [token], block, { withSupply: true }),
        ]);

        const poolTokens: any[] = await getUnderlyingPrices(
          balances,
          chain,
          timestamp,
          unknownTokensList,
        );
        if (poolTokens.includes(undefined) || poolTokens.length == 0) {
          unknownPoolList.push({
            address: [pool].map((i: any) => i.output)[0],
            token,
            balances,
            tokenInfo,
            poolTokens,
          });
          continue;
        }
        const poolValue: number = poolTokens.reduce(
          (p, c) => p + c.balance * c.price,
          0,
        );

        if (
          isNaN(
            (poolValue * 10 ** tokenInfo.decimals[0].output) /
              tokenInfo.supplies[0].output,
          ) ||
          tokenInfo.supplies[0].output == 0
        ) {
          continue;
        }

        const confidence =
          poolTokens
            .map((p: any) => {
              if (p.confidence == undefined) return 1;
              return p.confidence;
            })
            .reduce((a, b) => a + b, 0) / poolTokens.length;

        addToDBWritesList(
          writes,
          chain,
          token,
          (poolValue * 10 ** tokenInfo.decimals[0].output) /
            tokenInfo.supplies[0].output,
          tokenInfo.decimals[0].output,
          tokenInfo.symbols[0].output,
          timestamp,
          "curve-LP",
          confidence,
        );
      } catch {
        //console.log([pool].map((i: any) => i.output)[0]);
      }
    }
  }
}
async function unknownTokens(
  chain: any,
  block: number | undefined,
  writes: Write[],
  timestamp: number,
  unknownPoolList: any[],
) {
  const usdSwapSize = 5 * 10 ** 5;
  const knownTokenIndexes: TokenIndexes[] = unknownPoolList.map((p: any) => {
    const unknownTokens = p.poolTokens.filter((t: any) => t == undefined);
    const knownTokens = p.poolTokens.filter((t: any) => t != undefined);
    return {
      known: knownTokens.map((t: any) => p.poolTokens.indexOf(t)),
      unknown: unknownTokens.map((t: any) => p.poolTokens.indexOf(t)),
    };
  });

  const calls: any[] = knownTokenIndexes
    .map((ts: TokenIndexes, i: number) => {
      return ts.unknown.map((t: number) => {
        const tokenInfo = unknownPoolList[i].poolTokens[ts.known[0]];
        if (ts.known.length == 0 || tokenInfo.price == 0) return;
        const realQuantity = BigNumber.from(
          (usdSwapSize / tokenInfo.price).toFixed(0),
        );
        const decimalFactor = BigNumber.from("10").pow(tokenInfo.decimals);
        const rawQuantity = realQuantity.mul(decimalFactor);
        return [
          {
            params: [ts.known[0], t, rawQuantity],
            target: unknownPoolList[i].address,
          },
          {
            params: [ts.known[0], t, rawQuantity.div(usdSwapSize)],
            target: unknownPoolList[i].address,
          },
        ];
      });
    })
    .flat(2)
    .filter((c: any) => c != undefined);

  let dys: MultiCallResults = await multiCall({
    chain,
    calls,
    abi: abi.get_dy,
    block,
  });
  await requery(dys, chain, abi.get_dy, block);
  await requery(dys, chain, abi.get_dy2, block);
  await requery(dys, chain, abi.get_dy2, block);

  const unknownTokens = dys.output
    .map((d: Result, i: number) => {
      if (i % 2 == 0) return;
      const index = d.input.params[1];
      const poolInfo = unknownPoolList.find(
        (p: any) => p.address == d.input.target,
      );
      return poolInfo.balances[index].input.target;
    })
    .filter((c: any) => c != undefined);

  const unknownTokenInfos = await getTokenInfo(chain, unknownTokens, block);

  const prices = dys.output.map((d: Result, i: number) => {
    const decimals = unknownTokenInfos.decimals[Math.floor(i / 2)].output;
    return (i % 2 == 0 ? usdSwapSize : 1) / (d.output / 10 ** decimals);
  });

  prices.map((p: any, i: number) => {
    if (i % 2 == 0) return;
    if (prices[i] == Infinity || prices[i - 1] == Infinity) return;
    let confidence = p / prices[i - 1];
    if (confidence > 0.989) confidence = 0.989;
    addToDBWritesList(
      writes,
      chain,
      unknownTokens[Math.floor(i / 2)],
      p,
      unknownTokenInfos.decimals[Math.floor(i / 2)].output,
      unknownTokenInfos.symbols[Math.floor(i / 2)].output,
      timestamp,
      "curve-unknown-token",
      confidence,
    );
  });
}
export default async function getTokenPrices(
  chain: any,
  registries: string[],
  timestamp: number,
  name: string | undefined = undefined,
) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const poolList = await getPools(chain, block, name);
  const writes: Write[] = [];
  let unknownTokensList: string[] = [];
  let unknownPoolList: any[] = [];

  await unknownPools(
    chain,
    block,
    timestamp,
    poolList,
    registries,
    writes,
    unknownPoolList,
    unknownTokensList,
  );
  await unknownTokens(chain, block, writes, timestamp, unknownPoolList);

  let problems: string[] = [];
  unknownTokensList = [...new Set(unknownTokensList)];
  unknownTokensList.map((t: string) => {
    const writeKeys = writes.map((w: Write) =>
      w.PK.substring(w.PK.indexOf(":") + 1),
    );
    if (!writeKeys.includes(t)) problems.push(t);
  });

  await listUnknownTokens(chain, problems, block);

  return writes;
}
