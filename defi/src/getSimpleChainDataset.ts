import { wrap, IResponse, errorResponse } from "./utils/shared";
import { getChainDisplayName, chainCoingeckoIds, transformNewChainName } from "./utils/normalizeChain";
import { getCachedHistoricalTvlForAllProtocols, getHistoricalTvlForAllProtocols } from "./storeGetCharts";
import { formatTimestampAsDate, getClosestDayStartTimestamp, secondsInHour } from "./utils/date";
import { buildRedirectR2, getR2, storeDatasetR2 } from "./utils/r2";

export async function getSimpleChainDatasetInternal(rawChain: string, params: any = {}) {
  const categorySelected = params.category === undefined ? undefined : decodeURI(params.category).replace("_", " ");
  const globalChain = rawChain === "All" ? null : getChainDisplayName(rawChain.toLowerCase(), true);

  const sumDailyTvls = {} as {
    [ts: number]: {
      [protocol: string]: number;
    };
  };

  let historicalProtocolTvlsData: Awaited<ReturnType<typeof getHistoricalTvlForAllProtocols>> = await getCachedHistoricalTvlForAllProtocols(categorySelected === "Bridge", categorySelected === undefined, {
    getHistTvlMeta: params.getHistTvlMeta,
  });
  const { historicalProtocolTvls, lastDailyTimestamp } = historicalProtocolTvlsData

  historicalProtocolTvls.forEach((protocolTvl) => {
    if (!protocolTvl) {
      return;
    }
    if (categorySelected !== undefined && protocolTvl.protocol.category !== categorySelected) {
      return
    }

    let { historicalTvl, protocol, lastTimestamp } = protocolTvl;

    const lastTvl = historicalTvl[historicalTvl.length - 1];

    while (lastTimestamp < lastDailyTimestamp) {
      lastTimestamp = getClosestDayStartTimestamp(lastTimestamp + 24 * secondsInHour);
      historicalTvl.push({
        ...lastTvl,
        SK: lastTimestamp,
      });
    }

    historicalTvl.forEach((item) => {
      let chainToBeUsed = globalChain;
      const itemHasChains = Object.keys(item).some(
        (chain) => chainCoingeckoIds[getChainDisplayName(chain, true)] !== undefined
      );
      if (!itemHasChains && transformNewChainName(protocol.chain) === globalChain) {
        chainToBeUsed = null;
      }
      const prefix = chainToBeUsed === null ? "" : `${chainToBeUsed}-`;

      let dayTvl = 0;

      Object.entries(item).forEach(([chain, tvl]) => {
        const chainName = getChainDisplayName(chain, true);
        if (chainName.startsWith(prefix)) {
          const sectionName = chainName.slice(prefix.length);

          if (params[sectionName] === "true") {
            dayTvl += tvl;
            return;
          }
        }

        if ((chainToBeUsed === null && chain === "tvl") || chainToBeUsed === chainName) {
          if (protocol.doublecounted || protocol.category?.toLowerCase() === "liquid staking") {
            if (protocol.doublecounted && params["doublecounted"] === "true") {
              dayTvl += tvl;
            }

            if (protocol.category?.toLowerCase() === "liquid staking" && params["liquidstaking"] === "true") {
              dayTvl += tvl;
            }
            if (
              protocol.doublecounted &&
              protocol.category?.toLowerCase() === "liquid staking" &&
              params["doublecounted"] === "true" &&
              params["liquidstaking"] === "true"
            ) {
              dayTvl -= tvl;
            }
          } else {
            dayTvl += tvl;
          }
        }
      });

      if (dayTvl !== 0) {
        const timestamp = getClosestDayStartTimestamp(item.SK);
        if (sumDailyTvls[timestamp] === undefined) {
          sumDailyTvls[timestamp] = {};
        }
        if (sumDailyTvls[timestamp]!.Total === undefined) {
          sumDailyTvls[timestamp].Total = 0;
        }
        sumDailyTvls[timestamp][protocol.name] = dayTvl;
        sumDailyTvls[timestamp].Total += dayTvl;
      }
    });
  });

  const timestamps = Object.keys(sumDailyTvls).sort();

  // column headers
  const grid = [["Protocol", ...timestamps.map((t) => formatTimestampAsDate(t))]];

  // store row index
  let lastRow = 1;

  const protocolToRow = {
    Total: lastRow,
  } as { [protocol: string]: number };

  grid[1] = ["Total"];

  timestamps.forEach((t, i) => {
    Object.entries(sumDailyTvls[Number(t)]).forEach(([protocol, tvl]) => {
      let row = protocolToRow[protocol];
      if (row === undefined) {
        row = ++lastRow;
        protocolToRow[protocol] = lastRow;
        grid[lastRow] = [protocol];
      }
      grid[row][i + 1] = String(tvl);
    });
  });

  if (grid.length <= 2) {
    return { error: "No chain with that name exists" }
  } else {
    // convert data to csv format
    const csv = grid.map((r) => r.join(",")).join("\n");

    let filename = `simpleDataset/chain-dataset-${rawChain}-${Object.entries(params).map(t => `${t[0]}=${t[1]}`).sort().join("&")}.csv`;

    if (!params.readFromPG)
      await storeDatasetR2(filename, csv);
    else 
      filename = `chain-dataset-${rawChain}.csv`

    return { filename, csv }
  }
};

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const rawChain = decodeURI(event.pathParameters!.chain!);
  const params = event.queryStringParameters ?? {};
  const { filename, error } = await getSimpleChainDatasetInternal(rawChain, params);
  if (error) return errorResponse({ message: error });

  return buildRedirectR2(filename!, 10 * 60);
};

export default wrap(handler);
