import { wrap, IResponse, errorResponse } from "./utils";
import { getHistoricalValues } from "./utils/dynamodb";
import protocols from "./protocols/data";
import {
    dailyTvl,
    dailyUsdTokensTvl,
    dailyTokensTvl,
} from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";

type Tokens = {
    SK: number,
    tvl: {
        [symbol: string]: number
    }
}[] | undefined
function buildHeader(header: string[], tokens: Tokens, isUsd: boolean) {
    if (tokens !== undefined) {
        tokens.forEach(snapshot => {
            Object.keys(snapshot.tvl).forEach(tokenSymbol => {
                const symbol = isUsd ? `${tokenSymbol} (USD)` : tokenSymbol
                if (!header.includes(symbol)) {
                    header.push(symbol)
                }
            })
        })
    }
}
function addToRow(header: string[], row: number[], timestamp: number, tokens: Tokens, isUsd: boolean) {
    const tokenSnapshot = tokens?.find(snap => snap.SK === timestamp)?.tvl
    if (tokenSnapshot !== undefined) {
        Object.entries(tokenSnapshot).forEach(([tokenSymbol, amount]) => {
            const symbol = isUsd ? `${tokenSymbol} (USD)` : tokenSymbol
            const headerPosition = header.indexOf(symbol)
            row[headerPosition] = amount
        })
    }
}
function pad(s:number) { return (s < 10) ? '0' + s : s; }

const handler = async (
    event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
    let protocolName = event.pathParameters?.protocol?.toLowerCase();
    protocolName = protocolName?.substring(0, protocolName.length - '.csv'.length);
    const protocolData = protocols.find(
        (prot) => sluggify(prot) === protocolName
    );
    if (protocolData === undefined) {
        return errorResponse({
            message: "Protocol is not in our database",
        });
    }
    const [usd, usdTokens, tokens] = await Promise.all([getHistoricalValues(dailyTvl(protocolData.id)), getHistoricalValues(dailyUsdTokensTvl(protocolData.id)), getHistoricalValues(dailyTokensTvl(protocolData.id))])
    const header = ['Date', 'TVL (USD)']
    buildHeader(header, usdTokens as Tokens, true)
    buildHeader(header, tokens as Tokens, false)
    const rows = [header]
    for (const usdTvl of usd!) {
        const newRow = new Array(header.length).fill('-');
        const date = new Date(usdTvl.SK);
        const formattedDate = `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}`
        newRow[0] = formattedDate;
        newRow[1] = usdTvl.tvl;
        addToRow(header, newRow, usdTvl.SK, usdTokens as Tokens, true)
        addToRow(header, newRow, usdTvl.SK, tokens as Tokens, false)
        rows.push(newRow)
    }

    const response: IResponse = {
        statusCode: 200,
        body: rows.map(row => row.join(',')).join('\n'),
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${protocolName}.csv`
        }
    };
    return response;
};

export default wrap(handler);
