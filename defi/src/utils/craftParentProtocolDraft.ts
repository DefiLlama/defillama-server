import type { IParentProtocol } from "../protocols/types";
import protocols from "../protocols/data";
import { errorResponse } from "./shared";
import { IProtocolResponse, ICurrentChainTvls, IChainTvl, ITokens, IRaise } from "../types";
import sluggify from "./sluggify";
import fetch from "node-fetch";

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

export async function craftParentProtocolDraft({
  parentProtocol,
  useHourlyData,
  skipAggregatedTvl,
}: {
  parentProtocol: IParentProtocol;
  useHourlyData: boolean;
  skipAggregatedTvl: boolean;
}) {
  const childProtocols = protocols.filter((protocol) => protocol.parentProtocol === parentProtocol.id);

  if (childProtocols.length < 1 || childProtocols.map((p) => p.name).includes(parentProtocol.name)) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const PROTOCOL_API = useHourlyData ? "https://api.llama.fi/hourly" : "https://api.llama.fi/updatedProtocol";

  const childProtocolsTvls: Array<IProtocolResponse> = await Promise.all(
    childProtocols.map((protocolData) =>
      fetch(`${PROTOCOL_API}/${sluggify(protocolData)}?includeAggregatedTvl=true`).then((res) => res.json())
    )
  );

  const isHourlyTvl = (tvl: Array<{ date: number }>) =>
    tvl.length < 2 || tvl[1].date - tvl[0].date < 86400 ? true : false;

  const areAllChildProtocolTvlsHourly =
    childProtocolsTvls.length === childProtocolsTvls.filter((x) => isHourlyTvl(x.tvl)).length;

  const currentTime = Math.floor(Date.now() / 1000);

  const { currentChainTvls, chainTvls, tokensInUsd, tokens, tvl } = childProtocolsTvls
    .sort((a, b) => b.tvl.length - a.tvl.length)
    .reduce<ICombinedTvls>(
      (acc, curr) => {
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

            // roundoff lasthourly date
            if (index === curr.chainTvls[chain].tvl.length - 1) {
              nearestDate = currentTime;
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

            // roundoff lasthourly date
            if (index === curr.chainTvls[chain].tokensInUsd!.length - 1) {
              nearestDate = currentTime;
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

            // roundoff lasthourly date
            if (index === curr.chainTvls[chain].tokens!.length - 1) {
              nearestDate = currentTime;
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

        if (!skipAggregatedTvl) {
          if (curr.tokensInUsd) {
            curr.tokensInUsd.forEach(({ date, tokens }, index) => {
              let nearestDate = date;

              // roundoff lasthourly date
              if (index === curr.tokensInUsd!.length - 1) {
                nearestDate = currentTime;
              }

              Object.keys(tokens).forEach((token) => {
                if (!acc.tokensInUsd[nearestDate]) {
                  acc.tokensInUsd[nearestDate] = {};
                }

                acc.tokensInUsd[nearestDate][token] = (acc.tokensInUsd[nearestDate][token] || 0) + tokens[token];
              });
            });
          }

          if (curr.tokens) {
            curr.tokens.forEach(({ date, tokens }, index) => {
              let nearestDate = date;

              // roundoff lasthourly date
              if (index === curr.tokens!.length - 1) {
                nearestDate = currentTime;
              }

              Object.keys(tokens).forEach((token) => {
                if (!acc.tokens[nearestDate]) {
                  acc.tokens[nearestDate] = {};
                }

                acc.tokens[nearestDate][token] = (acc.tokens[nearestDate][token] || 0) + tokens[token];
              });
            });
          }

          curr.tvl.forEach(({ date, totalLiquidityUSD }, index) => {
            let nearestDate = date;

            // roundoff lasthourly date
            if (index === curr.tvl!.length - 1) {
              nearestDate = currentTime;
            }

            acc.tvl[nearestDate] = (acc.tvl[nearestDate] || 0) + totalLiquidityUSD;
          });
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
