import { getMissingData } from "../../src/api2/scripts/checkForProtocolsMissingTokenInfo";
import { getProtocolTokenDominanceTable } from "../../src/api2/scripts/getProtocolTokenDominanceTable";

export async function runMiscCommand(ws: any, data: any) {
  const { action, } = data;
  console.log('Running misc action:', action);
  switch (action) {
    case 'Get protocols missing tokens':
      ws.send(JSON.stringify({
        type: 'get-protocols-missing-tokens-response',
        data: await getMissingData(),
      })); return;
    case 'Get protocols token dominance':
      ws.send(JSON.stringify({
        type: 'get-protocols-token-dominance-response',
        data: await getProtocolTokenDominanceTable(),
      })); return;

    default: console.error('Unknown misc action:', action); break;
  }
}
