const abi = require("./abi.json");
const contracts = require("./contracts.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import { batchGet, batchWrite } from "../../../utils/shared/dynamodb";

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
// async function fixWrappedTokenBalances(balances, block, chain, transform) {
//   if (contracts[chain].yearnTokens) {
//     for (let token of Object.values(contracts[chain].yearnTokens)) {
//       token = token.toLowerCase();
//       if (balances[token] || balances[`${chain}:${token}`]) {
//         await unwrapYearn(balances, token, block, chain, transform, true);
//       }
//     }
//   }

//   if (contracts[chain].creamTokens) {
//     const creamTokens = Object.values(contracts[chain].creamTokens);
//     await unwrapCreamTokens(balances, block, chain, creamTokens, transform);
//   }

//   if (contracts[chain].sdTokens) {
//     await unwrapSdTokens(balances, contracts[chain].sdTokens, chain);
//   }
// }
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
  const balances: result[] = (
    await multiCall({
      calls: calls as any,
      chain: chain as any,
      abi: "erc20:balanceOf"
    })
  ).output;

  return balances;
}
function PoolToToken(pool: any) {
  pool = pool.output.toLowerCase();
  const mapping: any = {
    // pool contract : token contract
    "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7":
      "0x6c3f90f043a72fa612cbac8115ee7e52bde6e490"
  };
  return mapping[pool] ? mapping[pool] : pool;
}
async function tokenInfo(chain: string, target: string) {
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

  return balances.map((b: any) => {
    let underlyingPrice: any = underlyingPrices.filter((p) =>
      p.PK.includes(b.input.target.toLowerCase())
    )[0];
    let redirect: any;
    if (underlyingPrice.redirect) {
      redirect = redirectResults.filter(
        (p) => p.symbol == underlyingPrice.symbol
      )[0];
    }
    return {
      balance: b.output / 10 ** underlyingPrice.decimals,
      price: redirect.price
    };
  });
}
export async function getTokenPrices(chain: string) {
  const poolList = await getPools(chain);
  const writes: any = [];

  for (let registry of Object.keys(poolList)) {
    for (let pool of Object.values(poolList[registry])) {
      const token: string = PoolToToken(pool);
      const [
        balances,
        [{ output: supply }, { output: decimals }]
      ] = await Promise.all([
        poolBalances(chain, pool, registry),
        tokenInfo(chain, token)
      ]);

      const poolTokens: any[] = await getUnderlyingPrices(balances, chain);
      const poolValue: number = poolTokens.reduce(
        (p, c) => p + c.balance * c.price,
        0
      );
      writes.push({
        SK: Date.now(),
        PK: `${chain}:${token}`,
        price: (poolValue * 10 ** decimals) / supply
      });
    }
  }

  console.log("DONE");
}
