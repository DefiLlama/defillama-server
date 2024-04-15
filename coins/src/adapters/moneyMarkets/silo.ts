import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";
import * as sdk from '@defillama/sdk'
import { getLogs } from "../../utils/cache/getLogs";

const config: any = {
  ethereum: {
    factories: [
      {
        START_BLOCK: 15307294,
        SILO_FACTORY: '0x4D919CEcfD4793c0D47866C8d0a02a0950737589', // Silo Ethereum (Original)
      },
      {
        START_BLOCK: 17391885,
        SILO_FACTORY: '0x6d4A256695586F61b77B09bc3D28333A91114d5a' // Silo Ethereum (Convex Factory)
      },
      {
        START_BLOCK: 17782576,
        SILO_FACTORY: '0x2c0fA05281730EFd3ef71172d8992500B36b56eA' // Silo Ethereum (LLAMA Edition)
      }
    ]
  },
  arbitrum: {
    factories: [
      {
        START_BLOCK: 51894508,
        SILO_FACTORY: '0x4166487056A922D784b073d4d928a516B074b719', // Silo Arbitrum (Original)
      }
    ]
  },
}

export function silo(timestamp: number = 0) {
  console.log("starting silo");
  return Promise.all(
    Object.keys(config).map((chain) => getTokenPrice(chain, timestamp)),
  );
}
const fallbackBlacklist = ["0x6543ee07cf5dd7ad17aeecf22ba75860ef3bbaaa",];

async function getSilos(api: sdk.ChainApi) {
  const chain = api.chain
  let logs: any[] = [];
  for (let factory of config[chain].factories) {
    const { SILO_FACTORY, START_BLOCK, } = factory;
    let logChunk = await getLogs({
      api,
      target: SILO_FACTORY,
      fromBlock: START_BLOCK,
      topic: 'NewSiloCreated(address,address,uint128)',
    })
    logs = [...logs, ...logChunk];
  }

  return logs.map((log: any) => `0x${log.topics[1].substring(26)}`).filter((address: any) => fallbackBlacklist.indexOf(address.toLowerCase()) === -1);
}

async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const pricesObject: any = {}
  const writes: Write[] = [];
  const silos = await getSilos(api)
  const assetsAndStates = await api.multiCall({ abi: abi.getAssetsWithState, calls: silos })
  const collTokens = assetsAndStates.map((v0: any) => v0.assetsStorage.map((v: any, i: number) => [
    { token: v.collateralToken, balance: v.totalDeposits, uToken: v0.assets[i] },
    { token: v.collateralOnlyToken, balance: v.collateralOnlyDeposits, uToken: v0.assets[i] },
  ]).flat()).flat().filter((v: any) => +v.balance > 0)
  const tokenSupplies = await api.multiCall({ abi: 'erc20:totalSupply', calls: collTokens.map((v: any) => v.token) })
  collTokens.forEach((v: any, i: number) => {
    pricesObject[v.token] = { underlying: v.uToken, price: v.balance / tokenSupplies[i] }
  })
  // add debt tokens
  assetsAndStates.forEach((v0: any) => {
    v0.assetsStorage.forEach((v: any, i: number) => {
      pricesObject[v.debtToken] = { underlying: v0.assets[i], price: -1 }
    })
  })
  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'silo' })
}

const abi = {
  "getAssetsWithState": "function getAssetsWithState() view returns (address[] assets, tuple(address collateralToken, address collateralOnlyToken, address debtToken, uint256 totalDeposits, uint256 collateralOnlyDeposits, uint256 totalBorrowAmount)[] assetsStorage)",
}