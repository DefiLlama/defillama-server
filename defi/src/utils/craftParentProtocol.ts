import type { IParentProtocol } from "../protocols/types";
import protocols from "../protocols/data";
import { errorResponse } from "./shared";
import craftProtocol from "./craftProtocol";
import { IProtocolResponse, ICurrentChainTvls, IChainTvl, ITokens, IRaise } from "../types";

interface ICombinedTvls {
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
}

export default async function craftParentProtocol(
  parentProtocol: IParentProtocol,
  useNewChainNames: boolean,
  useHourlyData: boolean
) {
  const childProtocols = protocols.filter((protocol) => protocol.parentProtocol === parentProtocol.id);

  if (childProtocols.length < 1 || childProtocols.map((p) => p.name).includes(parentProtocol.name)) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const childProtocolsTvls = await Promise.all(
    childProtocols.map(async (c) => await craftProtocol(c, useNewChainNames, useHourlyData, false))
  );

  const hourlyChildProtocols = childProtocolsTvls.reduce((acc, curr) => (acc += curr.tvl.length <= 7 ? 1 : 0), 0);

  const { currentChainTvls, chainTvls } = childProtocolsTvls.reduce<ICombinedTvls>(
    (acc, curr) => {
      // skip adding hourly tvls if child protocol is a newly listed protocol, and parent protocol has other children with more tvl values
      if (hourlyChildProtocols !== childProtocolsTvls.length && curr.tvl.length <= 7) {
        return acc;
      }

      const hourlyIndexStartingIndex =
        hourlyChildProtocols === childProtocolsTvls.length && curr.tvl.length <= 7 ? 8 : 2;

      // TOTAL TVL OF EACH CHAIN
      for (const name in curr.currentChainTvls) {
        acc.currentChainTvls = {
          ...acc.currentChainTvls,
          [name]: (acc.currentChainTvls[name] || 0) + curr.currentChainTvls[name],
        };
      }

      // TVL, NO.OF TOKENS, TOKENS IN USD OF EACH CHAIN BY DATE
      for (const chain in curr.chainTvls) {
        // TVLS OF EACH CHAIN BY DATE
        curr.chainTvls[chain].tvl.forEach(({ date, totalLiquidityUSD }, index) => {
          let nearestDate = date;

          if (!acc.chainTvls[chain]) {
            acc.chainTvls[chain] = {
              tvl: {},
              tokensInUsd: {},
              tokens: {},
            };
          }

          if (index > curr.chainTvls[chain].tvl!.length - hourlyIndexStartingIndex && !acc.chainTvls[chain].tvl[date]) {
            const prevDate = curr.chainTvls[chain].tvl[index - 1].date;

            if (new Date(prevDate * 1000).getUTCHours() === 0) {
              for (
                let i = prevDate + 1;
                i <= Number((new Date().getTime() / 1000).toFixed(0)) && nearestDate === date;
                i++
              ) {
                if (acc.chainTvls[chain].tvl[i]) {
                  nearestDate = i;
                }
              }
            }
          }

          acc.chainTvls[chain].tvl = {
            ...acc.chainTvls[chain].tvl,
            [nearestDate]: (acc.chainTvls[chain].tvl[nearestDate] || 0) + totalLiquidityUSD,
          };
        });
        //   // TOKENS IN USD OF EACH CHAIN BY DATE
        curr.chainTvls[chain].tokensInUsd?.forEach(({ date, tokens }, index) => {
          let nearestDate = date;

          if (!acc.chainTvls[chain]) {
            acc.chainTvls[chain] = {
              tvl: {},
              tokensInUsd: {},
              tokens: {},
            };
          }

          if (
            index > curr.chainTvls[chain].tokensInUsd!.length - hourlyIndexStartingIndex &&
            !acc.chainTvls[chain].tokensInUsd[date]
          ) {
            const prevDate = curr.chainTvls[chain].tokensInUsd![index - 1].date;

            if (new Date(prevDate * 1000).getUTCHours() === 0) {
              for (
                let i = prevDate + 1;
                i <= Number((new Date().getTime() / 1000).toFixed(0)) && nearestDate === date;
                i++
              ) {
                if (acc.chainTvls[chain].tokensInUsd[i]) {
                  nearestDate = i;
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
          }
        });
        // NO.OF TOKENS IN EACH CHAIN BY DATE
        curr.chainTvls[chain].tokens?.forEach(({ date, tokens }, index) => {
          let nearestDate = date;

          if (!acc.chainTvls[chain]) {
            acc.chainTvls[chain] = {
              tvl: {},
              tokensInUsd: {},
              tokens: {},
            };
          }

          if (
            index > curr.chainTvls[chain].tokens!.length - hourlyIndexStartingIndex &&
            !acc.chainTvls[chain].tokens[date]
          ) {
            const prevDate = curr.chainTvls[chain].tokens![index - 1].date;

            if (new Date(prevDate * 1000).getUTCHours() === 0) {
              for (
                let i = prevDate + 1;
                i <= Number((new Date().getTime() / 1000).toFixed(0)) && nearestDate === date;
                i++
              ) {
                if (acc.chainTvls[chain].tokens[i]) {
                  nearestDate = i;
                }
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

      return acc;
    },
    {
      currentChainTvls: {},
      chainTvls: {},
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

  const response: IProtocolResponse = {
    ...parentProtocol,
    currentChainTvls,
    chainTvls: formattedChainTvls,
    tokens: [],
    tokensInUsd: [],
    tvl: [],
    isParentProtocol: true,
    raises: childProtocolsTvls?.reduce((acc, curr) => {
      acc = [...acc, ...(curr.raises || [])];
      return acc;
    }, [] as Array<IRaise>),
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
    response.hallmarks = [];
    childProtocolsTvls
      .filter((childModule) => childModule.hallmarks)
      .forEach((m) => {
        m.hallmarks?.forEach((hallmark: [number, string]) => response.hallmarks?.push(hallmark));
      });

    response.hallmarks.sort((a, b) => a[0] - b[0]);
  }

  return response;
}
