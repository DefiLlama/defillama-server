import { getHistoricalValues } from "../utils/shared/dynamodb";
import { Protocol } from "../protocols/data";
import { dailyTvl, dailyUsdTokensTvl, dailyTokensTvl } from "../utils/getLastRecord";
import { formatTimestampAsDate, getClosestDayStartTimestamp } from "../utils/date";
import { normalizeChain } from "../utils/normalizeChain";
import { PassThrough } from "stream";

function normalizeChainTotal(chain: string) {
  return chain === "tvl" ? "Total" : chain;
}

function addTokenRows(
  historicalTokenTvls: AWS.DynamoDB.DocumentClient.ItemList | undefined,
  grid: Grid,
  protocol: Protocol,
  nextRowNumber: number,
  timeToColumn: Grid,
  rowName: string
) {
  if (historicalTokenTvls !== undefined && historicalTokenTvls.length > 0) {
    const lastItem = historicalTokenTvls[historicalTokenTvls.length - 1];
    Object.keys(lastItem).forEach((chain) => {
      if (chain === "PK" || chain === "SK") {
        return;
      }
      const allTokens = historicalTokenTvls.reduce((acc, curr) => {
        if (curr[chain] !== undefined && typeof curr[chain] === "object") {
          Object.keys(curr[chain]).forEach((token) => acc.add(token));
        }
        return acc;
      }, new Set<string>()) as Set<string>;
      allTokens.forEach((token) => {
        grid[nextRowNumber] = [protocol.name, protocol.category, normalizeChainTotal(chain), rowName, token];
        // TODO: Optimize this
        historicalTokenTvls.forEach((historicalTvl) => {
          const timestamp = getClosestDayStartTimestamp(historicalTvl.SK);
          if (timeToColumn[timestamp] === undefined) {
            timeToColumn[timestamp] = {};
          }
          timeToColumn[timestamp][nextRowNumber] = historicalTvl[chain]?.[token];
        });
        nextRowNumber += 1;
      });
    });
  }
  return nextRowNumber;
}

function addBasicChain(historicalItems: AWS.DynamoDB.DocumentClient.ItemList | undefined, basicChain: string) {
  const chain = normalizeChain(basicChain);
  historicalItems?.forEach((item) => {
    // if (!item[chain]) {
    //   item[chain] = item.tvl;
    // }

    Object.keys(item).forEach((key) => {
      if (key.startsWith("avax")) {
        item[key.replace("avax", "avalanche")] = item[key];
        delete item[key];
      }
    });
  });
  return historicalItems;
}

type Grid = {
  [row: number]: {
    [column: number]: any;
  };
};

export default async function (protocols: Protocol[], vertical = false, stream = false) {
  const timeToColumn = {} as Grid;
  const grid = {} as Grid;
  if (vertical === true) {
    grid[0] = [undefined, undefined, undefined, undefined, undefined];
  } else {
    grid[0] = [undefined, "Category", "Chain", "Category", "Token"];
  }
  grid[1] = ["Date"];
  grid[2] = ["Timestamp"];
  let nextRowNumber = 3;
  await Promise.all(
    protocols.map(async (protocol) => {
      const [usd, usdTokens, tokens] = await Promise.all([
        getHistoricalValues(dailyTvl(protocol.id)),
        getHistoricalValues(dailyUsdTokensTvl(protocol.id)),
        getHistoricalValues(dailyTokensTvl(protocol.id)),
      ]).then((results) => results.map((r) => addBasicChain(r, protocol.chain)));

      if (usd === undefined || usd.length === 0) {
        return;
      }
      const lastItem = usd[usd.length - 1];
      Object.keys(lastItem).forEach((chain) => {
        if (chain === "PK" || chain === "SK") {
          return;
        }
        grid[nextRowNumber] = [protocol.name, protocol.category, normalizeChainTotal(chain), "TVL"];
        usd.forEach((historicalTvl) => {
          const timestamp = getClosestDayStartTimestamp(historicalTvl.SK);
          if (timeToColumn[timestamp] === undefined) {
            timeToColumn[timestamp] = {};
          }
          timeToColumn[timestamp][nextRowNumber] = historicalTvl[chain];
        });
        nextRowNumber += 1;
      });

      nextRowNumber = addTokenRows(usdTokens, grid, protocol, nextRowNumber, timeToColumn, "Tokens(USD)");
      nextRowNumber = addTokenRows(tokens, grid, protocol, nextRowNumber, timeToColumn, "Tokens");
    })
  );

  const timestamps = Object.keys(timeToColumn);
  timestamps.sort().forEach((timestamp, index) => {
    const formattedDate = formatTimestampAsDate(timestamp);
    const columnNumber = index + (grid[0] as any).length;
    grid[1][columnNumber] = formattedDate;
    grid[2][columnNumber] = timestamp;
    Object.entries(timeToColumn[Number(timestamp)]).forEach(([row, value]) => {
      grid[Number(row)][columnNumber] = value;
    });
  });

  const maxColumn = (grid[0] as any).length + timestamps.length;
  // Doing it this way instead of constructing a giant string to improve efficiency
  const rows = [] as String[];
  for (let i = 0; i < (vertical ? maxColumn : nextRowNumber); i++) {
    let row = [];
    for (let j = 0; j < (vertical ? nextRowNumber : maxColumn); j++) {
      const cell = vertical ? grid[j][i] : grid[i][j];
      row.push(cell ?? "");
    }
    rows.push(row.join(","));
  }
  if (stream) {
    const stream = new PassThrough();
    rows.map((r) => stream.push(r + "\n"));
    stream.end();
    return stream;
  } else {
    return rows.join("\n");
  }
}
