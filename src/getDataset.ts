import { wrap, IResponse, errorResponse } from "./utils";
import { getHistoricalValues } from "./utils/dynamodb";
import allProtocols, { Protocol } from "./protocols/data";
import {
  dailyTvl,
  dailyUsdTokensTvl,
  dailyTokensTvl,
} from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";
import { getClosestDayStartTimestamp } from "./date/getClosestDayStartTimestamp";

function pad(s: number) {
  return s < 10 ? "0" + s : s;
}

function normalizeChain(chain:string){
  return chain==='tvl'?'Total':chain
}

function addTokenRows(historicalTokenTvls: AWS.DynamoDB.DocumentClient.ItemList | undefined, grid: Grid, protocol: Protocol, nextRowNumber: number, timeToColumn: Grid, rowName: string) {
  if (historicalTokenTvls !== undefined && historicalTokenTvls.length > 0) {
    const lastItem = historicalTokenTvls[historicalTokenTvls.length - 1]
    Object.keys(lastItem).forEach(chain => {
      if (chain === 'PK' || chain === 'SK') {
        return
      }
      const allTokens = historicalTokenTvls.reduce((acc, curr) => {
        if (curr[chain] !== undefined && typeof curr[chain] === 'object') {
          Object.keys(curr[chain]).forEach(token => acc.add(token))
        }
        return acc;
      }, new Set<string>()) as Set<string>
      allTokens.forEach(token => {
        grid[nextRowNumber] = [protocol.name, protocol.category, normalizeChain(chain), rowName, token]
        // TODO: Optimize this
        historicalTokenTvls.forEach(historicalTvl => {
          const timestamp = getClosestDayStartTimestamp(historicalTvl.SK);
          if (timeToColumn[timestamp] === undefined) {
            timeToColumn[timestamp] = {}
          }
          timeToColumn[timestamp][nextRowNumber] = historicalTvl[chain]?.[token]
        })
        nextRowNumber += 1
      })
    })
  }
  return nextRowNumber
}

type Grid = {
  [row: number]: {
    [column: number]: any
  }
};

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  let protocolName = event.pathParameters?.protocol?.toLowerCase();
  protocolName = protocolName?.substring(
    0,
    protocolName.length - ".csv".length
  );
  let protocols: typeof allProtocols;
  if(!isNaN(Number(protocolName))){
    protocols = allProtocols.slice(0, Number(protocolName))
  } else if (protocolName === 'all') {
    protocols = allProtocols
  } else {
    const protocolData = allProtocols.find(
      (prot) => sluggify(prot) === protocolName
    );
    if (protocolData === undefined) {
      return errorResponse({
        message: "Protocol is not in our database",
      });
    }
    protocols = [protocolData];
  }
  const timeToColumn = {} as Grid;
  const grid = {} as Grid;
  grid[0] = [undefined, 'Category', 'Chain', 'Category', 'Token'];
  grid[1] = ['Date']
  grid[2] = ['Timestamp']
  let nextRowNumber = 3;
  await Promise.all(protocols.map(async protocol => {
    const [usd, usdTokens, tokens] = await Promise.all([
      getHistoricalValues(dailyTvl(protocol.id)),
      getHistoricalValues(dailyUsdTokensTvl(protocol.id)),
      getHistoricalValues(dailyTokensTvl(protocol.id)),
    ]);
    if (usd === undefined || usd.length === 0) {
      return
    }
    const lastItem = usd[usd.length - 1]
    Object.keys(lastItem).forEach(chain => {
      if (chain === 'PK' || chain === 'SK') {
        return
      }
      grid[nextRowNumber] = [protocol.name, protocol.category, normalizeChain(chain), 'TVL']
      usd.forEach(historicalTvl => {
        const timestamp = getClosestDayStartTimestamp(historicalTvl.SK);
        if (timeToColumn[timestamp] === undefined) {
          timeToColumn[timestamp] = {}
        }
        timeToColumn[timestamp][nextRowNumber] = historicalTvl[chain]
      })
      nextRowNumber += 1
    })

    nextRowNumber = addTokenRows(usdTokens, grid, protocol, nextRowNumber, timeToColumn, 'Tokens(USD)')
    nextRowNumber = addTokenRows(tokens, grid, protocol, nextRowNumber, timeToColumn, 'Tokens')
  }))

  const timestamps = Object.keys(timeToColumn);
  timestamps.sort().forEach((timestamp, index) => {
    const date = new Date(Number(timestamp) * 1000);
    const formattedDate = `${pad(date.getDate())}/${pad(
      date.getMonth() + 1
    )}/${date.getFullYear()}`;
    const columnNumber = index + (grid[0] as any).length
    grid[1][columnNumber] = formattedDate
    grid[2][columnNumber] = timestamp
    Object.entries(timeToColumn[Number(timestamp)]).forEach(([row, value])=>{
      grid[Number(row)][columnNumber] = value
    })
  })

  const maxColumn = (grid[0] as any).length + timestamps.length
  // Doing it this way instead of constructing a giant string to improve efficiency
  const rows = []  as String[]
  for(let i=0; i<nextRowNumber; i++){
    let row = []
    for(let j=0; j<maxColumn; j++){
      const cell = grid[i][j]
      row.push(cell ?? "")
    }
    rows.push(row.join(','))
  }

  console.log('a')
  const response: IResponse = {
    statusCode: 200,
    body: rows.join("\n"),
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${protocolName}.csv`,
    },
  };
  console.log('good')
  return response;
};

export default wrap(handler);
