import { Token } from "./index";
import fs from "fs";
import * as git from 'simple-git'
import { sliceIntoChunks } from "@defillama/sdk/build/util";

export default async function bridge(): Promise<Token[]> {
  const items = await crawlAndPullChainTokens()

  // remove tokens that we already have mappings for in the server
  const keys = Object.keys(items)
  const pricedTokens = await getPricedTokens(keys)
  Object.keys(pricedTokens).forEach(key => delete items[key])

  const tokens: Token[] = Object.values(items)
  return tokens
}

async function getPricedTokens(keys: string[]) {
  const chunks = sliceIntoChunks(keys, 100)
  let pricedTokens = {}
  const burl = "https://coins.llama.fi/prices/current/";
  for (const chunk of chunks) {
    const res = await fetch(burl + chunk.join(","))
    const { coins } = await res.json()
    pricedTokens = { ...pricedTokens, ...coins }
  }
  return pricedTokens
}

async function crawlAndPullChainTokens() {

  await cloneRepo()

  const chainMapping: any = {
    'gravity-bridge': 'gravitybridge',
    'bnb-smart-chain': 'bsc',
    'avalanche': 'avax',
  }

  const tokenList: {
    [from: string]: Token
  } = {}

  const rootDir = __dirname + '/cosmos-chainlist/chainlist/chain'
  const chains = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const chain of chains) {
    if (chain.endsWith('-testnet')) continue;
    try {

      const chainLabel = chainMapping[chain] ?? chain
      const assetsPath = `${rootDir}/${chain}/assets_2.json`;
      const erc20Path = `${rootDir}/${chain}/erc20_2.json`;
      const cw20Path = `${rootDir}/${chain}/cw20_2.json`;

      if (fs.existsSync(assetsPath)) {
        const assets = JSON.parse(fs.readFileSync(assetsPath, 'utf-8'));
        assets.map(({ decimals, symbol, denom, type: assetType, coinGeckoId, counter_party, contract, origin_chain, origin_denom, }: any) => {
          if (typeof decimals !== 'number') return;

          let from = `${chainLabel}:${denom}`

          if (['ibc', 'bridge'].includes(assetType)) {
            if (!denom.startsWith('ibc/')) {
              // console.log('Not ibc denom:', denom)
            } else {
              denom = denom.slice(4)
              from = `ibc:${denom}`
            }
          }
          from = from.replace(/\//g, ':')
          if (coinGeckoId && coinGeckoId.length) {
            tokenList[from] = {
              symbol,
              decimals,
              from,
              to: `coingecko#${coinGeckoId}`,
            }
          } else if (counter_party) {
            tokenList[from] = {
              symbol,
              decimals,
              from,
              to: `${origin_chain}:${contract ? contract : origin_denom}`.replace(/\//g, ':'),
            }
          }
        })
      }

      if (fs.existsSync(cw20Path)) {
        const erc20 = JSON.parse(fs.readFileSync(cw20Path, 'utf-8'));
        erc20.map(({ decimals, symbol, coinGeckoId, contract }: any) => {
          if (!contract || !decimals || !coinGeckoId) return;
          const from = `${chainLabel}:${contract}`
          tokenList[from] = {
            symbol,
            decimals,
            from,
            to: `coingecko#${coinGeckoId}`,
          }
        })
      }

      if (fs.existsSync(erc20Path)) {
        const erc20 = JSON.parse(fs.readFileSync(erc20Path, 'utf-8'));
        erc20.map(({ decimals, symbol, coinGeckoId, contract }: any) => {
          if (!contract || !decimals || !coinGeckoId) return;
          const from = `${chainLabel}:${contract}`
          tokenList[from] = {
            symbol,
            decimals,
            from,
            to: `coingecko#${coinGeckoId}`,
          }
        })
      }
    } catch (e) { }
  }

  return tokenList
}


async function cloneRepo() {

  // checkout cosmosstation chainlist repo to pull cosmos token - coingecko mapping
  try {
    const progress = ({ method, stage, progress }: any) => {
      console.log(`cosmos chainlist: git.${method} ${stage} stage ${progress}% complete`);
    }
    const gitDir = __dirname + '/cosmos-chainlist'
    await ensureDirExists(gitDir)
    const repo = git.simpleGit({ progress, baseDir: gitDir, });
    const isRepo = await fs.promises.access(`${gitDir}/chainlist/.git`).then(() => true).catch(() => false);
    if (!isRepo) {
      await repo.clone('https://github.com/cosmostation/chainlist');
    }

    repo.cwd(gitDir + '/chainlist')
    await repo.checkout('main');
    await repo.pull();
  } catch (e) {
    console.error("Failed to store cosmos token mapping", e);
  }
}


async function ensureDirExists(folder: string) {
  try {
    await fs.promises.access(folder);
  } catch {
    try {
      await fs.promises.mkdir(folder, { recursive: true });
    } catch (e) {
      console.error(e)
    }
  }
}
