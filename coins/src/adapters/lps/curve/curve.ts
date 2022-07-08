const abi = require("./abi.json");
const contracts = require("./contracts.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import { getBalance } from "@defillama/sdk/build/eth/index";
import { batchGet, batchWrite } from "../../../utils/shared/dynamodb";

const gasTokenDummyAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const registryIds = {
  stableswap: 0,
  stableFactory: 3,
  crypto: 5,
  cryptoFactory: 6
};
interface result {
  success: boolean;
  input: {
    target: string;
  };
  output: any;
}
interface multicall {
  target: string;
  params: string[];
}
const wrappedGasTokens: { [key: string]: any } = {
  ethereum: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
};
async function getPools(chain: string) {
  const registries = (
    await multiCall({
      chain: chain as any,
      calls: Object.values(registryIds).map((r: any) => ({
        params: r,
        target: contracts[chain].addressProvider
      })),
      abi: abi.get_id_info
    })
  ).output.map((r: any) => r.output.addr);

  const poolCounts = (
    await multiCall({
      chain: chain as any,
      calls: registries.map((r: any) => ({
        target: r
      })),
      abi: abi.pool_count
    })
  ).output;

  const pools: any = {};
  for (let i = 0; i < Object.values(registryIds).length; i++) {
    pools[Object.keys(registryIds)[i]] = (
      await multiCall({
        calls: [...Array(Number(poolCounts[i].output)).keys()].map((n) => ({
          target: poolCounts[i].input.target,
          params: [n]
        })),
        chain: chain as any,
        abi: abi.pool_list
      })
    ).output;
  }

  return pools;
}
function mapGaugeTokenBalances(calls: multicall[], chain: string) {
  const mapping: any = {
    "0x1337bedc9d22ecbe766df105c9623922a27963ec": {
      to: "0x5b5cfe992adac0c9d48e05854b2d91c73a003858",
      pools: [],
      chains: ["avax"]
    },
    "0x7f90122bf0700f9e7e1f688fe926940e8839f353": {
      to: "0xbF7E49483881C76487b0989CD7d9A8239B20CA41",
      pools: [],
      chains: ["arbitrum"]
    },
    "0x27e611fd27b276acbd5ffd632e5eaebec9761e40": {
      to: "0x8866414733F22295b7563f9C5299715D2D76CAf4",
      pools: [],
      chains: ["fantom"]
    },
    "0xd02a30d33153877bc20e5721ee53dedee0422b2f": {
      to: "0xd4f94d0aaa640bbb72b5eec2d85f6d114d81a88e",
      pools: [],
      chains: ["fantom"]
    }
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
  let calls: multicall[] = [];
  [...Array(Number(nCoins[0])).keys()].map((n) =>
    calls.push({ target: coins[n], params: [pool.output] })
  );
  return calls;
}
async function getGasTokenBalances(chain: string, pool: any, balances: any) {
  const gasTokenBalance = (
    await getBalance({
      target: pool.output,
      chain: chain as any
    })
  ).output;
  balances.push({
    input: {
      target: wrappedGasTokens[chain] || null,
      params: [pool.output]
    },
    output: gasTokenBalance,
    success: true
  });

  balances = balances.filter(
    (b: any) => b.input.target != gasTokenDummyAddress
  );

  return balances;
}
async function poolBalances(chain: string, pool: any, registry: string) {
  const [{ output: nCoins }, { output: coins }] = await Promise.all([
    call({
      target: pool.input.target,
      params: [pool.output],
      chain: chain as any,
      abi: abi.get_n_coins[registry]
    }),
    call({
      target: pool.input.target,
      params: [pool.output],
      chain: chain as any,
      abi: abi.get_coins[registry]
    })
  ]);

  let calls: multicall[] = aggregateBalanceCalls(coins, nCoins, pool);
  calls = mapGaugeTokenBalances(calls, chain);
  let balances: result[] = (
    await multiCall({
      calls: calls as any,
      chain: chain as any,
      abi: "erc20:balanceOf"
    })
  ).output;

  if (
    balances.map((b) => b.input.target).includes(wrappedGasTokens[chain]) ||
    balances.map((b) => b.input.target).includes(gasTokenDummyAddress)
  ) {
    balances = await getGasTokenBalances(chain, pool, balances);
  }

  return balances;
}
async function PoolToToken(chain: string, pool: any) {
  pool = pool.output.toLowerCase();
  let token: string;

  try {
    token = (
      await call({
        target: pool,
        abi: abi.lp_token,
        chain: chain as any
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
        "0x70fc957eb90e37af82acdbd12675699797745f68"
    };
    token = mapping[pool] ? mapping[pool] : pool;
  }
  return token;
}
async function tokenInfo(chain: string, target: string) {
  try {
    return await Promise.all([
      call({
        target: target as any,
        chain: chain as any,
        abi: "erc20:totalSupply"
      }),
      call({
        target: target as any,
        chain: chain as any,
        abi: "erc20:decimals"
      })
    ]);
  } catch {
    console.log(`trouble fetching supply & decimals for ${target}`);
    return [];
  }
}
async function getUnderlyingPrices(balances: any, chain: string) {
  const underlyingPrices = await batchGet(
    balances.map((b: result) => ({
      PK: `asset#${chain}:${b.input.target.toLowerCase()}`,
      SK: 0
    }))
  );
  const redirects = [];
  for (let i = 0; i < underlyingPrices.length; i++) {
    if (!("redirect" in underlyingPrices[i])) continue;
    redirects.push({
      PK: underlyingPrices[i].redirect,
      SK: 0
    });
  }
  const redirectResults = await batchGet(redirects);

  balances.map((b: any) => {
    const underlyingPrice: any = underlyingPrices.filter((p) =>
      p.PK.includes(b.input.target.toLowerCase())
    )[0];
    let price;
    if (underlyingPrice.redirect) {
      let a = underlyingPrice.redirect;
      let b = redirectResults.filter((p) => p.PK == underlyingPrice.redirect);
      let c = b[0];
      let d = c.price;
      price = redirectResults.filter((p) => p.PK == underlyingPrice.redirect)[0]
        .price;
    } else {
      price = underlyingPrice.price;
    }

    return {
      balance: b.output / 10 ** underlyingPrice.decimals,
      price
    };
  });
  // THIS BLOCK DOES NOT WORK YET
  return balances.map((b: any) => {
    let underlyingPrice: any = underlyingPrices.filter((p) =>
      p.PK.includes(b.input.target.toLowerCase())
    )[0];
    let redirect: any;
    if (underlyingPrice.redirect) {
      redirect = redirectResults.filter(
        (p) => p.symbol == underlyingPrice.PK.includes()
      )[0];
    }
    return {
      balance: b.output / 10 ** underlyingPrice.decimals,
      price: redirect.price
    };
  });
  // THIS BLOCK DOES NOT WORK YET
}
export async function getTokenPrices(chain: string) {
  const poolList = await getPools(chain);
  const writes: any = [];

  let unknownTokens: string[] = [];
  for (let registry of ["stableswap", "crypto"]) {
    //Object.keys(poolList)) {
    for (let pool of Object.values(poolList[registry])) {
      const token: string = await PoolToToken(chain, pool);
      const [
        balances,
        [{ output: supply }, { output: decimals }]
      ] = await Promise.all([
        poolBalances(chain, pool, registry),
        tokenInfo(chain, token)
      ]);

      let poolTokens: any[] = [];
      try {
        poolTokens = await getUnderlyingPrices(balances, chain);
      } catch (e) {
        console.log(e);
      }
      try {
        const poolValue: number = poolTokens.reduce(
          (p, c) => p + c.balance * c.price,
          0
        );

        writes.push({
          SK: Date.now(),
          PK: `asset#${chain}:${token}`,
          price: (poolValue * 10 ** decimals) / supply
        });
      } catch (e) {
        unknownTokens.push(
          ...balances.map((b: any) => b.input.target.toLowerCase())
        );
      }
    }
  }

  console.log("check writes");
  await listUnknownTokens(chain, unknownTokens);

  await Promise.all([
    batchWrite(writes, true),
    batchWrite(
      writes.map((w: any) => w.SK == 0),
      true
    )
  ]);
}
async function listUnknownTokens(chain: string, unknownTokens: string[]) {
  unknownTokens = unknownTokens.reduce(function (a: string[], b) {
    if (a.indexOf(b) == -1) a.push(b);
    return a;
  }, []);
  const unknownSymbols = (
    await multiCall({
      calls: unknownTokens.map((t) => ({
        target: t
      })),
      abi: "erc20:symbol",
      chain: chain as any
    })
  ).output.map((o) => o.output);
  unknownTokens = unknownTokens.map((t, i) => `${unknownSymbols[i]}-${t}`);
  console.log(unknownTokens);
}
