import type { IParentProtocol } from "../protocols/types";
import protocols from "../protocols/data";
import { errorResponse } from "./shared";
import craftProtocol from "./craftProtocol";
import { IProtocolResponse, ICurrentChainTvls, IChainTvl } from "../types";

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

type ITokens = Array<{ date: number; tokens: { [token: string]: number } }>;

export default async function craftParentProtocol(
  parentProtocol: IParentProtocol,
  useNewChainNames: boolean,
  useHourlyData: boolean
) {
  const childProtocols = protocols.filter(
    (protocol) => protocol.parentProtocol === parentProtocol.id
  );

  if (
    childProtocols.length < 1 ||
    childProtocols.map((p) => p.name).includes(parentProtocol.name)
  ) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const childProtocolsTvls = await Promise.all(
    childProtocols.map(
      async (c) => await craftProtocol(c, useNewChainNames, useHourlyData)
    )
  );

  const { currentChainTvls, chainTvls, tokensInUsd, tokens, tvl } =
    childProtocolsTvls.reduce<ICombinedTvls>(
      (acc, curr) => {
        Object.entries(curr.currentChainTvls).forEach(([name, tvl]) => {
          acc.currentChainTvls = {
            ...acc.currentChainTvls,
            [name]: (acc.currentChainTvls[name] || 0) + tvl,
          };
        });

        Object.keys(curr.chainTvls).map((chain) => {
          curr.chainTvls[chain].tvl.forEach(({ date, totalLiquidityUSD }) => {
            if (!acc.chainTvls[chain]) {
              acc.chainTvls[chain] = {
                tvl: {},
                tokensInUsd: {},
                tokens: {},
              };
            }

            acc.chainTvls[chain].tvl = {
              ...acc.chainTvls[chain].tvl,
              [date]: (acc.chainTvls[chain].tvl[date] || 0) + totalLiquidityUSD,
            };
          });
        });

        if (curr.tokensInUsd) {
          curr.tokensInUsd.forEach(({ date, tokens }) => {
            Object.keys(tokens).forEach((token) => {
              if (!acc.tokensInUsd[date]) {
                acc.tokensInUsd[date] = {};
              }

              acc.tokensInUsd[date][token] =
                (acc.tokensInUsd[date][token] || 0) + tokens[token];
            });
          });
        }

        if (curr.tokens) {
          curr.tokens.forEach(({ date, tokens }) => {
            Object.keys(tokens).forEach((token) => {
              if (!acc.tokens[date]) {
                acc.tokens[date] = {};
              }

              acc.tokens[date][token] =
                (acc.tokens[date][token] || 0) + tokens[token];
            });
          });
        }

        curr.tvl.forEach(({ date, totalLiquidityUSD }) => {
          acc.tvl[date] = (acc.tvl[date] || 0) + totalLiquidityUSD;
        });

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

  const formattedTokens: ITokens = Object.keys(tokens).map((date) => {
    const _tokensData: {
      [token: string]: number;
    } = {};

    const _todaysTokens: [string, number][] = Object.entries(
      tokens[Number(date)]
    );

    _todaysTokens.forEach(([token, value]) => (_tokensData[token] = value));

    return {
      date: Number(date),
      tokens: _tokensData,
    };
  });

  const formattedTokensInUsd: ITokens = Object.keys(tokensInUsd).map((date) => {
    const _tokensData: {
      [token: string]: number;
    } = {};

    const _todaysTokens: [string, number][] = Object.entries(
      tokensInUsd[Number(date)]
    );

    _todaysTokens.forEach(([token, value]) => (_tokensData[token] = value));

    return {
      date: Number(date),
      tokens: _tokensData,
    };
  });

  const formattedChainTvls: IChainTvl = {};

  Object.keys(chainTvls).forEach((chain) => {
    const tvl = Object.entries(chainTvls[chain].tvl).map(
      ([date, totalLiquidityUSD]) => ({ date: Number(date), totalLiquidityUSD })
    );

    const tokens = Object.entries(chainTvls[chain].tokens).map((date) => ({
      date: Number(date),
      tokens: { ...chainTvls[chain].tokens[Number(date)] },
    }));

    const tokensInUsd = Object.entries(chainTvls[chain].tokensInUsd).map(
      (date) => ({
        date: Number(date),
        tokens: { ...chainTvls[chain].tokensInUsd[Number(date)] },
      })
    );

    formattedChainTvls[chain] = {
      tvl,
      tokens,
      tokensInUsd,
    };
  });

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
  };

  const jsonData = JSON.stringify(response)
  const dataLength = jsonData.length

  if(dataLength >= 5.8e6){
    response.tokens = null
    response.tokensInUsd = null
  }

  return response;
}
