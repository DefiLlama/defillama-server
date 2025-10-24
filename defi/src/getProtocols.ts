import protocols, { Protocol } from "./protocols/data";
import { getLastRecord, hourlyTvl, hourlyUsdTokensTvl } from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";
import {
  getChainDisplayName,
  getDisplayChain,
  nonChains,
  addToChains,
  extraSections,
  transformNewChainName,
  replaceChainNamesForOraclesByChain,
} from "./utils/normalizeChain";
import type { IProtocol, ITvlsByChain } from "./types";
import fetch from "node-fetch";
import cgSymbolsJson from "./utils/symbols/symbols.json";
import { parentProtocolsById } from "./protocols/parentProtocols";

const cgSymbols: { [id: string]: string } = cgSymbolsJson;

export function getPercentChange(previous: number, current: number) {
  const change = (current / previous) * 100 - 100;
  if (change == Infinity || Number.isNaN(change)) {
    return null;
  }
  return change;
}

const majors = [
  "BTC",
  "ETH",
  "WBTC",
  "WETH",
  "aWBTC",
  "ammWBTC",
  "wstETH",
  "aEthwstETH",
  "aWETH",
  "ammWETH",
  "aEthWETH",
  "stETH",
  "aSTETH",
  "rETH",
  "sETH2",
  "rETH2",
  "frxETH",
  "sfrxETH",
  "renBTC",
  "icETH",
  "BTCB",
  "BETH",
  "mETH",
].map((t) => t.toUpperCase());
export const stablecoins = [
  "USDT",
  "USDC",
  "DAI",
  "FRAX",
  "AUSDC",
  "AMMUSDC",
  "AETHUSDC",
  "ADAI",
  "AMMDAI",
  "AETHDAI",
  "AUSDT",
  "AMMUSDT",
  "LUSD",
  "ALUSD",
  "GUSD",
  "AGUSD",
  "TUSD",
  "ATUSD",
  "USDP",
  "AUSDP",
  "FEI",
  "AFEI",
  "BUSD",
  "YYDAI+YUSDC+YUSDT+YTUSD",
  "CDAI",
  "BSC-USD",
  "USD+",
  "SUSD",
  "DOLA",
  "AMUSDC",
  "AMDAI",
  "AVUSDC",
  "AVDAI",
  "AAVAUSDC",
  "AMUSDT",
  "AAVAUSDT",
  "AAVADAI",
  "AVUSDT",
  "AOPTUSDC",
  "SUSDE",
  "USDY",
  "USTC",
  "MIM",
  "USDN",
  "YUSD",
  "USDD",
  "PAI",
  "HUSD",
  "NUSD",
  "FLEXUSD",
  "OUSD",
  "CUSD",
  "RSV",
  "MUSD",
  "USDK",
  "VAI",
  "TOR",
  "DOC",
  "USDS",
  "USDB",
  "USDJ",
  "STBL",
  "VOLT",
  "RAI",
  "FLOAT",
  "USDX",
  "ZUSD",
  "USX",
  "ASEED",
  "BAI",
  "EURT",
  "EURC",
  "EURS",
  "CEUR",
  "SEUR",
  "USN",
  "EURA",
  "PAR",
  "USH",
  "3USD",
  "SIGUSD",
  "HOME",
  "FIAT",
  "PUSD",
  "FUSD",
  "UXD",
  "USDH",
  "FPI",
  "BEAN",
  "USDL",
  "DUSD",
  "VST",
  "KUSD",
  "USDTZ",
  "MONEY",
  "UUSD",
  "USDI",
  "NOTE",
  "LISUSD",
  "USK",
  "ARUSD",
  "USDW",
  "BOB",
  "USDR",
  "IUSD",
  "XAI",
  "RUSD",
  "IBEUR",
  "PINA",
  "DJED",
  "BAOUSD",
  "USP",
  "EUROE",
  "CASH",
  "DSU",
  "EURE",
  "ANONUSD",
  "NXUSD",
  "DCHF",
  "EUSD",
  "CZUSD",
  "D2O",
  "CRVUSD",
  "DAI+",
  "USDT+",
  "SILK",
  "CLEVUSD",
  "R",
  "GRAI",
  "ERN",
  "GHO",
  "FDUSD",
  "PYUSD",
  "SLSD",
  "GYEN",
  "STAR",
  "PEUSD",
  "EUSD(V2)",
  "MKUSD",
  "LCNY",
  "NEX",
  "SVUSD",
  "UAHT",
  "USDM",
  "NARS",
  "IST",
  "CDT",
  "EEUR",
  "EGBP",
  "HYDT",
  "USDV",
  "HYUSD",
  "CADC",
  "USDE",
  "AEUR",
  "MYUSD",
  "SCB",
  "ZKUSD",
  "BUCK",
  "USDGLO",
  "VCHF",
  "VEUR",
  "USDRIF",
  "DLLR",
  "EURD",
  "XUSD",
  "ULTRA",
  "USDCB",
  "AUDD",
  "CGUSD",
  "FETH",
  "FXUSD",
  "GAI",
  "EURO3",
  "HAI",
  "BUIDL",
  "PXDC",
  "FXD",
  "UNO",
  "USD3",
  "CJPY",
  "BREAD",
  "ZUNUSD",
  "ZUNETH",
  "BTCUSD",
  "WEN",
  "GYD",
  "ISC",
  "KNOX",
  "USC",
  "RGUSD",
  "BITUSD",
  "USDA",
  "USD0",
  "USR",
  "AUSD",
  "CREAL",
  "HCHF",
  "HEXDC",
  "USDZ",
  "BNUSD",
  "DYAD",
  "DCKUSD",
  "DEUSD",
  "THUSD",
  "MOD",
  "M",
  "SATUSD",
  "USDF",
  "USDTB",
  "PAUSD",
  "XY",
  "ZEUSD",
  "ZCHF",
  "BOLD",
  "USDQ",
  "LVLUSD",
  "HONEY",
  "PINTO",
  "WUSD",
  "FRXUSD",
  "SYUSD",
  "USYC",
  "SCUSD",
  "EURR",
  "USDO",
  "CSUSDL",
  "EUROP",
  "USDFC",
  "BRZ",
  "RLUSD",
  "FEUSD",
  "USBD",
  "EURCV",
  "REUSD",
  "TBILL",
  "A7A5",
  "MSD",
  "VUSD",
  "USD1",
  "MEAD",
  "YU",
  "BENJI",
  "AVUSD",
  "YLDS",
  "USDAF",
  "EURQ",
  "WEUSD",
  "PARAUSD",
  "CNHT",
  "MXNT",
  "USDU",
  "MNEE",
  "GGUSD",
  "USDG",
  "USND",
  "EBUSD",
  "XSGD",
  "VGBP",
  "BNBUSD",
  "USDA+",
  "MSUSD",
]

function getTokenBreakdowns(lastRecord: { tvl: { [token: string]: number }; ownTokens: { [token: string]: number } }) {
  const breakdown = {
    ownTokens: 0,
    stablecoins: 0,
    majors: 0,
    others: 0,
  };

  if (lastRecord["ownTokens"]) {
    for (const token in lastRecord["ownTokens"]) {
      breakdown.ownTokens = breakdown.ownTokens + lastRecord["ownTokens"][token];
    }
  }

  for (const token in lastRecord.tvl) {
    const normalizedToken = cgSymbols[token.replace("coingecko:", "")] ?? token;
    if (majors.includes(normalizedToken)) {
      breakdown.majors = breakdown.majors + lastRecord.tvl[token];
    } else if (stablecoins.some((stable) => normalizedToken.includes(stable))) {
      breakdown.stablecoins = breakdown.stablecoins + lastRecord.tvl[token];
    } else {
      breakdown.others = breakdown.others + lastRecord.tvl[token];
    }
  }

  return breakdown;
}

const apiV1Functions = {
  getCoinMarkets: async (protocols: Protocol[]) =>
    fetch("https://coins.llama.fi/mcaps", {
      method: "POST",
      body: JSON.stringify({
        coins: protocols
          .filter((protocol) => typeof protocol.gecko_id === "string")
          .map((protocol) => `coingecko:${protocol.gecko_id}`),
      }),
    }).then((r) => r.json()),
  getLastHourlyRecord: async (protocol: Protocol) => getLastRecord(hourlyTvl(protocol.id)),
  getLastHourlyTokensUsd: async (protocol: Protocol) => getLastRecord(hourlyUsdTokensTvl(protocol.id)),
};

export async function craftProtocolsResponseInternal(
  useNewChainNames: boolean,
  protocolList: Protocol[],
  includeTokenBreakdowns?: boolean,
  {
    getCoinMarkets = apiV1Functions.getCoinMarkets,
    getLastHourlyRecord = apiV1Functions.getLastHourlyRecord,
    getLastHourlyTokensUsd = apiV1Functions.getLastHourlyTokensUsd,
  } = {}
) {
  const coinMarkets = await getCoinMarkets(protocolList);

  const response = (
    await Promise.all(
      protocolList.map(async (protocol) => {
        let [lastHourlyRecord, lastHourlyTokensUsd] = await Promise.all([
          getLastHourlyRecord(protocol),
          includeTokenBreakdowns ? getLastHourlyTokensUsd(protocol) : {},
        ]);

        if (!lastHourlyRecord && protocol.module !== "dummy.js") {
          return null;
        }

        const returnedProtocol: Partial<Protocol> = { ...protocol };
        delete returnedProtocol.module;

        const chainTvls: ITvlsByChain = {};
        const chains: string[] = [];

        if (protocol.module !== "dummy.js" && lastHourlyRecord) {
          Object.entries(lastHourlyRecord).forEach(([chain, chainTvl]) => {
            if (nonChains.includes(chain)) {
              return;
            }
            const chainDisplayName = getChainDisplayName(chain, useNewChainNames);
            chainTvls[chainDisplayName] = chainTvl;
            addToChains(chains, chainDisplayName);
          });
          if (chains.length === 0) {
            const chain = useNewChainNames ? transformNewChainName(protocol.chain) : protocol.chain;
            if (chainTvls[chain] === undefined) {
              chainTvls[chain] = lastHourlyRecord.tvl;
            }
            extraSections.forEach((section) => {
              const chainSectionName = `${chain}-${section}`;
              if (chainTvls[section] !== undefined && chainTvls[chainSectionName] === undefined) {
                chainTvls[chainSectionName] = chainTvls[section];
              }
            });
            chains.push(getChainDisplayName(chain, useNewChainNames));
          }
        }

        const dataToReturn: Omit<IProtocol, "raises"> = {
          ...protocol,
          oraclesByChain: replaceChainNamesForOraclesByChain(useNewChainNames, protocol.oraclesByChain),
          slug: sluggify(protocol),
          tvl: lastHourlyRecord?.tvl ?? null,
          chainTvls,
          chains: chains.sort((a, b) => chainTvls[b] - chainTvls[a]),
          chain: getDisplayChain(chains),
          change_1h: lastHourlyRecord ? getPercentChange(lastHourlyRecord.tvlPrev1Hour, lastHourlyRecord.tvl) : null,
          change_1d: lastHourlyRecord ? getPercentChange(lastHourlyRecord.tvlPrev1Day, lastHourlyRecord.tvl) : null,
          change_7d: lastHourlyRecord ? getPercentChange(lastHourlyRecord.tvlPrev1Week, lastHourlyRecord.tvl) : null,
          tokenBreakdowns:
            includeTokenBreakdowns && lastHourlyTokensUsd ? getTokenBreakdowns(lastHourlyTokensUsd as any) : {},
          mcap: protocol.gecko_id ? coinMarkets?.[`coingecko:${protocol.gecko_id}`]?.mcap ?? null : null,
        };

        if (protocol.parentProtocol) {
          const parentProtocol = parentProtocolsById[protocol.parentProtocol];
          if (parentProtocol) dataToReturn.parentProtocolSlug = sluggify(parentProtocol as any);
        }

        const extraData: ["staking", "pool2"] = ["staking", "pool2"];

        for (let type of extraData) {
          if (lastHourlyRecord?.[type] !== undefined) {
            dataToReturn[type] = lastHourlyRecord[type];
          }
        }

        return dataToReturn;
      })
    )
  )
    .filter((protocol) => protocol !== null)
    .sort((a, b) => (b?.tvl ?? 0) - (a?.tvl ?? 0)) as IProtocol[];

  return response;
}

export async function craftProtocolsResponse(
  useNewChainNames: boolean,
  includeTokenBreakdowns?: boolean,
  options?: any
) {
  return craftProtocolsResponseInternal(useNewChainNames, protocols, includeTokenBreakdowns, options);
}
