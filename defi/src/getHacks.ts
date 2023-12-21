import { getAllAirtableRecords } from "./utils/airtable";
import { successResponse, wrap, IResponse } from "./utils/shared";

export async function getHacksInternal() {
  let allRecords = await getAllAirtableRecords('appopBYHROXemyCqN/Sheet1')
  return allRecords
    .filter(
      (r) =>
        r.fields["Name"] !== undefined
    )
    .map((r) => ({
      date: new Date(r.fields["Date"]).getTime() / 1000,
      name: r.fields["Name"],
      classification: r.fields["Classification"] ?? null,
      technique: r.fields["Technique"] ?? null,
      amount: r.fields["Funds Lost"] ?? null,
      chain: r.fields["Chain"] ?? null,
      bridgeHack: r.fields["Bridge / Multichain Application"] ?? false,
      targetType: r.fields["Target Type"] ?? null,
      source: r.fields["Link"],
      returnedFunds: r.fields["Returned Funds"] ?? null,
      defillamaId: r.fields["DefiLlama Id"] ?? null,
    }));
}

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  return successResponse(await getHacksInternal(), 30 * 60);
};

export default wrap(handler);
