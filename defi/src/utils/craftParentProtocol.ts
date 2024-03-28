import type { IParentProtocol } from "../protocols/types";
import protocols from "../protocols/data";
import { errorResponse } from "./shared";
import { IProtocolResponse, ICurrentChainTvls, IChainTvl, ITokens, IRaise } from "../types";
import sluggify from "./sluggify";
import fetch from "node-fetch";
import { getAvailableMetricsById } from "../adaptors/data/configs";
import treasuries from "../protocols/treasury";
import { protocolMcap, getRaises } from "./craftProtocol";
import { getClosestDayStartTimestamp } from "./date";

export interface ICombinedTvls {
  currentChainTvls: ICurrentChainTvls;
  chainTvls: {
    [chain: string]: {
      tvl: {
        [date: number]: number;
      };
      tokensInUsd: {
        [date: number]: {
          [token: string]: number;
        };
      };
      tokens: {
        [date: number]: {
          [token: string]: number;
        };
      };
    };
  };
  tokensInUsd: {
    [date: number]: {
      [token: string]: number;
    };
  };
  tokens: {
    [date: number]: {
      [token: string]: number;
    };
  };
  tvl: {
    [date: number]: number;
  };
}

export default async function craftParentProtocol({
  parentProtocol,
  useHourlyData,
  skipAggregatedTvl,
  isTreasuryApi,
}: {
  parentProtocol: IParentProtocol;
  useHourlyData: boolean;
  skipAggregatedTvl: boolean;
  isTreasuryApi?: boolean;
}) {
  const childProtocols = isTreasuryApi
    ? treasuries
        .filter((protocol) => protocol.parentProtocol === parentProtocol.id)
        .map((p) => ({ ...p, name: p.name.replace(" (treasury)", "") }))
    : protocols.filter((protocol) => protocol.parentProtocol === parentProtocol.id);

  if (childProtocols.length < 1 || childProtocols.map((p) => p.name).includes(parentProtocol.name)) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const PROTOCOL_API = isTreasuryApi
    ? "https://api.llama.fi/treasury"
    : useHourlyData
    ? "https://api.llama.fi/hourly"
    : "https://api.llama.fi/updatedProtocol";

  const childProtocolsTvls: Array<IProtocolResponse> = await Promise.all(
    childProtocols.map((protocolData) =>
      fetch(`${PROTOCOL_API}/${sluggify(protocolData)}?includeAggregatedTvl=true`).then((res) => res.json())
    )
  );

  const isHourlyTvl = (tvl: Array<{ date: number }>) =>
    isTreasuryApi ? false : tvl.length < 2 || tvl[1].date - tvl[0].date < 86400 ? true : false;

  if (isTreasuryApi) {
    const child = childProtocolsTvls.filter((prot: any) => (prot.message ? false : true))?.[0] ?? null;

    if (!child) {
      return errorResponse({
        message: "Protocol is not in our database",
      });
    }

    return {
      ...parentProtocol,
      currentChainTvls: child.currentChainTvls,
      chainTvls: child.chainTvls,
      tokens: child.tokens,
      tokensInUsd: child.tokensInUsd,
      tvl: child.tvl,
      isParentProtocol: true,
    };
  }

  const { raises } = await getRaises();
  return craftParentProtocolInternal({
    parentProtocol,
    skipAggregatedTvl,
    isHourlyTvl,
    childProtocolsTvls,
    parentRaises:
      raises?.filter((raise: IRaise) => raise.defillamaId?.toString() === parentProtocol.id.toString()) ?? [],
  });
}

export async function craftParentProtocolInternal({
  parentProtocol,
  skipAggregatedTvl,
  childProtocolsTvls,
  isHourlyTvl,
  fetchMcap,
  parentRaises,
}: {
  parentProtocol: IParentProtocol;
  skipAggregatedTvl: boolean;
  isHourlyTvl: Function;
  fetchMcap?: Function;
  childProtocolsTvls: Array<IProtocolResponse>;
  parentRaises: IRaise[];
}) {
  if (!fetchMcap) fetchMcap = protocolMcap;

  const currentTime = Math.floor(Date.now() / 1000);

  const { currentChainTvls, chainTvls, tokensInUsd, tokens, tvl } = childProtocolsTvls
    .filter((prot: any) => (prot.message ? false : true))
    .sort((a, b) => (b.tvl ?? []).length - (a.tvl ?? []).length)
    .reduce<ICombinedTvls>(
      (acc, curr) => {
        const tokensExcludedFromParent = curr.tokensExcludedFromParent ?? [];
        const isTvlDataHourly = isHourlyTvl(curr.tvl);

        // store tvl to exclude by chain
        const tvlToExcludeByChain: { [chain: string]: number } = {};

        // TVL, NO.OF TOKENS, TOKENS IN USD OF EACH CHAIN BY DATE
        for (const chain in curr.chainTvls) {
          // store tvl to exclude by date
          const tvlToExcludeByDate: { [date: number]: number } = {};
          // TOKENS IN USD OF EACH CHAIN BY DATE
          curr.chainTvls[chain].tokensInUsd?.forEach(({ date, tokens }, index) => {
            if (!acc.chainTvls[chain]) {
              acc.chainTvls[chain] = {
                tvl: {},
                tokensInUsd: {},
                tokens: {},
              };
            }

            // roundoff lasthourly date
            let nearestDate = date;
            if (index === curr.chainTvls[chain].tokensInUsd!.length - 1) {
              nearestDate = currentTime;
            }

            // fill the missing dates in chart by calc avg of nearest dates combined value
            if (index !== 0 && !isTvlDataHourly) {
              let prevDate = curr.chainTvls[chain].tokensInUsd![index - 1].date;
              while (nearestDate - prevDate > 86400) {
                prevDate += 86400;
                const prev = curr.chainTvls[chain].tokensInUsd![index - 1];

                if (!acc.chainTvls[chain].tokensInUsd[prevDate]) {
                  acc.chainTvls[chain].tokensInUsd[prevDate] = {};
                }
                for (const token in tokens) {
                  acc.chainTvls[chain].tokensInUsd[prevDate][token] =
                    (acc.chainTvls[chain].tokensInUsd[prevDate][token] || 0) +
                    ((prev.tokens?.[token] ?? 0) + tokens[token]) / 2;

                  if (tokensExcludedFromParent.includes(token)) {
                    // store tvl to exclude by date
                    tvlToExcludeByDate[prevDate] =
                      (tvlToExcludeByDate[prevDate] || 0) + ((prev.tokens?.[token] ?? 0) + tokens[token]) / 2;
                  }
                }
              }
            }

            if (!acc.chainTvls[chain].tokensInUsd[nearestDate]) {
              acc.chainTvls[chain].tokensInUsd[nearestDate] = {};
            }

            for (const token in tokens) {
              acc.chainTvls[chain].tokensInUsd[nearestDate][token] =
                (acc.chainTvls[chain].tokensInUsd[nearestDate][token] || 0) + tokens[token];

              if (tokensExcludedFromParent.includes(token)) {
                // store tvl to exclude by date
                tvlToExcludeByDate[nearestDate] = (tvlToExcludeByDate[nearestDate] || 0) + tokens[token];
              }
            }
          });
          tvlToExcludeByChain[chain] = Object.values(tvlToExcludeByDate).slice(-1)?.[0] ?? 0;

          // TVLS OF EACH CHAIN BY DATE
          curr.chainTvls[chain].tvl.forEach(({ date, totalLiquidityUSD }, index) => {
            if (!acc.chainTvls[chain]) {
              acc.chainTvls[chain] = {
                tvl: {},
                tokensInUsd: {},
                tokens: {},
              };
            }
            // roundoff lasthourly date
            let nearestDate = date;
            if (index === curr.chainTvls[chain].tvl.length - 1) {
              nearestDate = currentTime;
            } else {
              nearestDate = getClosestDayStartTimestamp(date);
            }

            // fill the missing dates in chart by calc avg of nearest dates combined value
            if (index !== 0 && !isTvlDataHourly) {
              let prevDate = curr.chainTvls[chain].tvl[index - 1].date;
              while (nearestDate - prevDate > 86400) {
                prevDate += 86400;
                const prev = curr.chainTvls[chain].tvl[index - 1];

                acc.chainTvls[chain].tvl = {
                  ...acc.chainTvls[chain].tvl,
                  [prevDate]:
                    (acc.chainTvls[chain].tvl[prevDate] || 0) +
                    (prev.totalLiquidityUSD + totalLiquidityUSD) / 2 -
                    (tvlToExcludeByDate[prevDate] || 0),
                };
              }
            }

            acc.chainTvls[chain].tvl = {
              ...acc.chainTvls[chain].tvl,
              [nearestDate]:
                (acc.chainTvls[chain].tvl[nearestDate] || 0) +
                totalLiquidityUSD -
                (tvlToExcludeByDate[nearestDate] || 0),
            };
          });
          // NO.OF TOKENS IN EACH CHAIN BY DATE
          curr.chainTvls[chain].tokens?.forEach(({ date, tokens }, index) => {
            if (!acc.chainTvls[chain]) {
              acc.chainTvls[chain] = {
                tvl: {},
                tokensInUsd: {},
                tokens: {},
              };
            }

            // roundoff lasthourly date
            let nearestDate = date;
            if (index === curr.chainTvls[chain].tokens!.length - 1) {
              nearestDate = currentTime;
            }

            // fill the missing dates in chart by calc avg of nearest dates combined value
            if (index !== 0 && !isTvlDataHourly) {
              let prevDate = curr.chainTvls[chain].tokens![index - 1].date;
              while (nearestDate - prevDate > 86400) {
                prevDate += 86400;
                const prev = curr.chainTvls[chain].tokens![index - 1];

                if (!acc.chainTvls[chain].tokens[prevDate]) {
                  acc.chainTvls[chain].tokens[prevDate] = {};
                }
                for (const token in tokens) {
                  acc.chainTvls[chain].tokens[prevDate][token] =
                    (acc.chainTvls[chain].tokens[prevDate][token] || 0) +
                    ((prev.tokens?.[token] ?? 0) + tokens[token]) / 2;
                }
              }
            }

            if (!acc.chainTvls[chain].tokens[nearestDate]) {
              acc.chainTvls[chain].tokens[nearestDate] = {};
            }

            for (const token in tokens) {
              acc.chainTvls[chain].tokens[nearestDate][token] =
                (acc.chainTvls[chain].tokens[nearestDate][token] || 0) + tokens[token];
            }
          });
        }

        // TOTAL TVL OF EACH CHAIN
        for (const name in curr.currentChainTvls) {
          acc.currentChainTvls = {
            ...acc.currentChainTvls,
            [name]: (acc.currentChainTvls[name] || 0) + curr.currentChainTvls[name] - (tvlToExcludeByChain[name] ?? 0),
          };
        }

        if (!skipAggregatedTvl) {
          // store tvl to exclude by date
          const tvlToExcludeByDate: { [date: number]: number } = {};

          if (curr.tokensInUsd) {
            curr.tokensInUsd.forEach(({ date, tokens }, index) => {
              // roundoff lasthourly date
              let nearestDate = date;
              if (index === curr.tokensInUsd!.length - 1) {
                nearestDate = currentTime;
              }

              if (index !== 0 && !isTvlDataHourly) {
                let prevDate = curr.tokensInUsd![index - 1].date;
                while (nearestDate - prevDate > 86400) {
                  prevDate += 86400;
                  const prev = curr.tokensInUsd![index - 1];

                  Object.keys(tokens).forEach((token) => {
                    if (!acc.tokens[prevDate]) {
                      acc.tokens[prevDate] = {};
                    }

                    acc.tokens[prevDate][token] =
                      (acc.tokens[prevDate][token] || 0) + ((prev.tokens?.[token] ?? 0) + tokens[token]) / 2;

                    if (tokensExcludedFromParent.includes(token)) {
                      // store tvl to exclude by date
                      tvlToExcludeByDate[prevDate] =
                        (tvlToExcludeByDate[prevDate] || 0) + ((prev.tokens?.[token] ?? 0) + tokens[token]) / 2;
                    }
                  });
                }
              }

              Object.keys(tokens).forEach((token) => {
                if (!acc.tokensInUsd[nearestDate]) {
                  acc.tokensInUsd[nearestDate] = {};
                }

                acc.tokensInUsd[nearestDate][token] = (acc.tokensInUsd[nearestDate][token] || 0) + tokens[token];

                if (tokensExcludedFromParent.includes(token)) {
                  tvlToExcludeByDate[nearestDate] =
                    (tvlToExcludeByDate[nearestDate] || 0) + (acc.tokensInUsd[nearestDate][token] || 0) + tokens[token];
                }
              });
            });
          }

          if (curr.tokens) {
            curr.tokens.forEach(({ date, tokens }, index) => {
              // roundoff lasthourly date
              let nearestDate = date;
              if (index === curr.tokens!.length - 1) {
                nearestDate = currentTime;
              }

              if (index !== 0 && !isTvlDataHourly) {
                let prevDate = curr.tokens![index - 1].date;
                while (nearestDate - prevDate > 86400) {
                  prevDate += 86400;
                  const prev = curr.tokens![index - 1];

                  Object.keys(tokens).forEach((token) => {
                    if (!acc.tokens[prevDate]) {
                      acc.tokens[prevDate] = {};
                    }

                    acc.tokens[prevDate][token] =
                      (acc.tokens[prevDate][token] || 0) + ((prev.tokens?.[token] ?? 0) + tokens[token]) / 2;
                  });
                }
              }

              Object.keys(tokens).forEach((token) => {
                if (!acc.tokens[nearestDate]) {
                  acc.tokens[nearestDate] = {};
                }

                acc.tokens[nearestDate][token] = (acc.tokens[nearestDate][token] || 0) + tokens[token];
              });
            });
          }

          if (curr.tvl) {
            curr.tvl.forEach(({ date, totalLiquidityUSD }, index) => {
              // roundoff lasthourly date
              let nearestDate = date;
              if (index === curr.tvl!.length - 1) {
                nearestDate = currentTime;
              }

              if (index !== 0 && !isTvlDataHourly) {
                let prevDate = curr.tvl![index - 1].date;
                while (nearestDate - prevDate > 86400) {
                  prevDate += 86400;
                  const prev = curr.tvl![index - 1];
                  acc.tvl[prevDate] =
                    (acc.tvl[prevDate] || 0) +
                    (prev.totalLiquidityUSD + totalLiquidityUSD) / 2 -
                    (tvlToExcludeByDate[prevDate] || 0);
                }
              }

              acc.tvl[nearestDate] =
                (acc.tvl[nearestDate] || 0) + totalLiquidityUSD - (tvlToExcludeByDate[nearestDate] || 0);
            });
          }
        }

        return acc;
      },
      {
        currentChainTvls: {},
        chainTvls: {},
        tokens: {},
        tokensInUsd: {},
        tvl: {},
      }
    );

  //  FORMAT TVL, TOKENS, TOKENS IN USD BY DATE OF EACH CHAIN TO MATCH TYPE AS IN NORMAL PROTOCOL RESPONSE
  const formattedChainTvls: IChainTvl = {};
  for (const chain in chainTvls) {
    const tvl = Object.entries(chainTvls[chain].tvl).map(([date, totalLiquidityUSD]) => ({
      date: Number(date),
      totalLiquidityUSD,
    }));

    const tokens: ITokens = [];
    for (const date in chainTvls[chain].tokens) {
      tokens.push({
        date: Number(date),
        tokens: chainTvls[chain].tokens[date],
      });
    }

    const tokensInUsd: ITokens = [];
    for (const date in chainTvls[chain].tokensInUsd) {
      tokens.push({
        date: Number(date),
        tokens: chainTvls[chain].tokensInUsd[date],
      });
    }

    formattedChainTvls[chain] = {
      tvl,
      tokens,
      tokensInUsd,
    };
  }

  //  FORMAT NO.OF TOKENS BY DATE TO MATCH TYPE AS IN NORMAL PROTOCOL RESPONSE
  const formattedTokens: ITokens = [];
  for (const date in tokens) {
    formattedTokens.push({ date: Number(date), tokens: tokens[date] });
  }

  //  FORMAT TOTAL TOKENS VALUE IN USD BY DATE TO MATCH TYPE AS IN NORMAL PROTOCOL RESPONSE
  const formattedTokensInUsd: ITokens = [];
  for (const date in tokensInUsd) {
    formattedTokensInUsd.push({
      date: Number(date),
      tokens: tokensInUsd[date],
    });
  }

  // FORMAT TVL BY DATE TO MATCH TYPE AS IN NORMAL PROTOCOL RESPONSE
  const formattedTvl = Object.entries(tvl).map(([date, totalLiquidityUSD]) => ({
    date: Number(date),
    totalLiquidityUSD,
  }));

  const [tokenMcap] = await Promise.all([fetchMcap(parentProtocol.gecko_id)]);

  const response: IProtocolResponse = {
    ...parentProtocol,
    currentChainTvls,
    chainTvls: formattedChainTvls,
    tokens: formattedTokens,
    tokensInUsd: formattedTokensInUsd,
    tvl: formattedTvl,
    isParentProtocol: true,
    raises: childProtocolsTvls?.reduce((acc, curr) => {
      acc = [...acc, ...(curr.raises || [])];
      return acc;
    }, parentRaises as Array<IRaise>),
    metrics: getAvailableMetricsById(parentProtocol.id),
    symbol:
      parentProtocol.symbol ??
      (parentProtocol.gecko_id
        ? childProtocolsTvls.find((p) => p.gecko_id === parentProtocol.gecko_id)?.symbol
        : null) ??
      null,
    treasury: parentProtocol.treasury ?? childProtocolsTvls.find((p) => p.treasury)?.treasury ?? null,
    mcap: tokenMcap ?? childProtocolsTvls.find((p) => p.mcap)?.mcap ?? null,
  };

  // Filter overall tokens, tokens in usd by date if data is more than 6MB
  const jsonData = JSON.stringify(response);
  const dataLength = jsonData.length;

  if (dataLength >= 5.8e6) {
    for (const chain in response.chainTvls) {
      response.chainTvls[chain].tokens = null;
      response.chainTvls[chain].tokensInUsd = null;
    }
  }

  if (childProtocolsTvls.length > 0) {
    response.otherProtocols = childProtocolsTvls[0].otherProtocols;

    // show all hallmarks of child protocols on parent protocols chart
    const hallmarks: { [date: number]: string } = {};
    childProtocolsTvls.forEach((module) => {
      if (module.hallmarks) {
        module.hallmarks.forEach(([date, desc]: [number, string]) => {
          if (!hallmarks[date] || hallmarks[date] !== desc) {
            hallmarks[date] = desc;
          }
        });
      }
    });

    response.hallmarks = Object.entries(hallmarks)
      .map(([date, desc]) => [Number(date), desc])
      .sort((a, b) => (a[0] as number) - (b[0] as number)) as Array<[number, string]>;
  }

  return response;
}
