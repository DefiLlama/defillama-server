import getTokenPrices from "./misc";
import tokens from "./tokens.json";
import tokensQiDAO from "./tokensQiDAO.json";
import { getYieldWrites2 } from "../../utils/yieldTokens";
import { getLogs } from "../../../utils/cache/getLogs";
import { getApi } from "../../utils/sdk";
import { calculate4626Prices } from "../../utils/erc4626";
import { fetch } from "../../utils";
import { chainIdMap } from "../../bridges/celer";

const mmConfig: any = {
  ethereum: {
    factory: "0xA9c3D3a366466Fa809d1Ae982Fb2c46E5fC41101",
    fromBlock: 18925584,
  },
};

// Tokemak Autopool registries - listVaults() returns all ERC4626 autopools
const tokemakConfig: { [chain: string]: string } = {
  ethereum: "0x7E5828a3A6Ae75426d739E798140513A2E2964E4",
  base: "0x4fE7916A10B15DADEFc59D06AC81757112b1feCE",
  arbitrum: "0xc3b8F578c25bE230A2C0f56Cb466e7B8c6c9D268",
  plasma: "0x0dA0E8f8dF8b6541affB071C6e0FF6835154e1dc",
  linea: "0xf25f616CCc086ddA1129323381EfA1edC8d5F42c",
};

export async function misc4626(timestamp: number = 0) {
  const metaMorphos = Object.keys(mmConfig).map((c) =>
    getMetaMorphos(c, timestamp),
  );
  const tokemakPools = Object.keys(tokemakConfig).map((c) =>
    getTokemakVaults(c, timestamp),
  );
  const calls = Object.keys(tokens).map((c) => getTokenPrices(c, timestamp));
  const callsQiDAO = Object.keys(tokensQiDAO).map((c) =>
    getQiDAOTokenPrices(c, timestamp),
  );
  return Promise.all([calls, callsQiDAO, metaMorphos, tokemakPools].flat());
}

async function getTokemakVaults(chain: string, timestamp: number) {
  const registry = tokemakConfig[chain];
  const api = await getApi(chain, timestamp);
  const vaults: string[] = await api.call({
    target: registry,
    abi: "function listVaults() view returns (address[])",
  });
  return (
    await calculate4626Prices(chain, timestamp, vaults, "tokemak")
  ).filter((r) => isFinite(r.price ?? 0));
}

async function getQiDAOTokenPrices(chain: string, timestamp: number) {
  const priceAbi =
    "function calculateUnderlying(uint256) view returns (uint256)";
  const tokens: string[] = Object.values((tokensQiDAO as any)[chain]);
  return getYieldWrites2({
    chain,
    timestamp,
    tokens,
    priceAbi,
    underlyingAbi: "address:token",
    projectName: "qidao",
  });
}

async function getMetaMorphos(chain: string, timestamp: number) {
  const { factory, fromBlock } = mmConfig[chain];
  const api = await getApi(chain, timestamp);
  const logs = await getLogs({
    api,
    target: factory,
    fromBlock,
    eventAbi:
      "event CreateMetaMorpho (address indexed metaMorpho, address indexed caller, address initialOwner, uint256 initialTimelock, address indexed asset, string name, string symbol, bytes32 salt)",
    onlyArgs: true,
  });
  const tokens = logs.map((l: any) => l.metaMorpho);
  return (
    await calculate4626Prices(chain, timestamp, tokens, "meta-morphos")
  ).filter((r) => isFinite(r.price ?? 0));
}

export async function spectra(timestamp: number) {
  const res = await fetch("https://app.spectra.finance/api/v1/mainnet/pools");
  const tokens: { [chain: string]: string[] } = {};
  res.map((market: any) => {
    const chain = chainIdMap[market.chainId];
    if (!(chain in tokens)) tokens[chain] = [];
    tokens[chain].push(market.ibt.address);
  });
  return Promise.all(
    Object.keys(tokens).map((chain) =>
      calculate4626Prices(chain, timestamp, tokens[chain], "spectra"),
    ),
  );
}

const siloV2Config: {
  [chain: string]: { START_BLOCK: number; SILO_FACTORY: string }[];
} = {
  sonic: [
    {
      START_BLOCK: 2672166,
      SILO_FACTORY: "0xa42001D6d2237d2c74108FE360403C4b796B7170",
    },
  ],
};

const siloV2VaultConfig: {
  [chain: string]: { START_BLOCK: number; SILO_FACTORY: string }[];
} = {
  sonic: [
    {
      START_BLOCK: 21718349,
      SILO_FACTORY: '0x4e125e605fdcf3b07bde441decf8edad423d5dc6'
    },
  ],
};

export async function siloV2(timestamp: number) {
  return Promise.all(
    Object.keys(siloV2Config).map(async (chain) => {
      const api = await getApi(chain, timestamp);
      const toBlock = await api.getBlock();

      let logs: any[] = [];
      for (let factory of siloV2Config[chain]) {
        const { SILO_FACTORY, START_BLOCK } = factory;
        let logChunk = await api.getLogs({
          target: SILO_FACTORY,
          fromBlock: START_BLOCK,
          toBlock,
          eventAbi:
            "event NewSilo (address indexed implementation, address indexed token0, address indexed token1, address silo0, address silo1, address siloConfig)",
          onlyArgs: true,
        });
        logs.push(...logChunk.map((log: any) => [log.silo0, log.silo1]).flat())
      }
      for (let factory of siloV2VaultConfig[chain]) {
        const { SILO_FACTORY, START_BLOCK } = factory;
        let logChunk = await api.getLogs({
          target: SILO_FACTORY,
          fromBlock: START_BLOCK,
          toBlock,
          eventAbi: 'event CreateSiloVault (address indexed SiloVault, address indexed caller, address initialOwner, uint256 initialTimelock, address indexed asset, string name, string symbol)',
          onlyArgs: true,
        });
        logs.push(...logChunk.map((log: any) => log.SiloVault))
      }

      const silos = [...new Set(logs.map((log: any) => log.toLowerCase())),];

      return (
        await calculate4626Prices(chain, timestamp, silos, "silo-v2")
      ).filter((r) => isFinite(r.price ?? 0));
    }),
  );
}
