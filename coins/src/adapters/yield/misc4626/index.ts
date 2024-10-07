import getTokenPrices from "./misc";
import tokens from "./tokens.json";
import tokensQiDAO from "./tokensQiDAO.json";
import { getYieldWrites2 } from "../../utils/yieldTokens";
import { getLogs } from "../../../utils/cache/getLogs";
import { getApi } from "../../utils/sdk";
import { calculate4626Prices } from "../../utils/erc4626";

const mmConfig: any = {
  ethereum: { factory: '0xA9c3D3a366466Fa809d1Ae982Fb2c46E5fC41101', fromBlock: 18925584, },
}

export function misc4626(timestamp: number = 0) {
  const metaMorphos = Object.keys(mmConfig).map((c) => getMetaMorphos(c, timestamp))
  const calls = Object.keys(tokens).map((c) => getTokenPrices(c, timestamp))
  const callsQiDAO = Object.keys(tokensQiDAO).map((c) => getQiDAOTokenPrices(c, timestamp))
  return Promise.all([calls, callsQiDAO, metaMorphos].flat())
}

async function getQiDAOTokenPrices(chain: string, timestamp: number) {
  const priceAbi = 'function calculateUnderlying(uint256) view returns (uint256)'
  const tokens: string[] = Object.values((tokensQiDAO as any)[chain]);
  return getYieldWrites2({ chain, timestamp, tokens, priceAbi, underlyingAbi: 'address:token', projectName: 'qidao'})
}

async function getMetaMorphos(chain: string, timestamp: number) {
  const { factory, fromBlock } = mmConfig[chain]
  const api = await getApi(chain, timestamp)
  const logs = await getLogs({ api, target: factory, fromBlock, eventAbi: 'event CreateMetaMorpho (address indexed metaMorpho, address indexed caller, address initialOwner, uint256 initialTimelock, address indexed asset, string name, string symbol, bytes32 salt)', onlyArgs: true, })
  const tokens = logs.map((l: any) => l.metaMorpho)
  return calculate4626Prices(chain, timestamp, tokens, 'meta-morphos')
}
