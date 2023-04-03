import fetch from "node-fetch";
import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse } from "./utils/shared";

const fetchProtocolEmissionData = async (protocol: string) => {
  const res = await getR2(`emissions/${protocol}`).then((res) => (res.body ? JSON.parse(res.body) : null));
  // const res = await fetch(`https://api.llama.fi/emission/${protocol}`)
  //   .then((res) => res.json())
  //   .then((res) => (res.body ? JSON.parse(res.body) : null));

  if (!res) {
    throw new Error(`protocol '${protocol}' has no chart to fetch`);
  }

  const protocolId = res.metadata.protocolIds?.[0] ?? null;

  const data: { [date: number]: number } = {};

  res.data.forEach((item: { data: Array<{ timestamp: number; unlocked: number }> }) => {
    item.data.forEach((value) => {
      data[value.timestamp] = (data[value.timestamp] || 0) + value.unlocked;
    });
  });

  const token = res.metadata.token;

  const tokenPrice = await fetch(`https://coins.llama.fi/prices/current/${token}?searchWidth=4h`).then((res) =>
    res.json()
  );

  const mcapRes = await fetch("https://coins.llama.fi/mcaps", {
    method: "POST",
    body: JSON.stringify({
      coins: res.gecko_id ? [`coingecko:${res.gecko_id}`] : [],
    }),
  }).then((r) => r.json());

  const now = Math.floor(Date.now() / 1000);
  const formattedData = Object.entries(data);
  const maxSupply = formattedData[formattedData.length - 1][1];
  const nextEventIndex = formattedData.findIndex(([date]) => Number(date) > now);
  const circSupply = nextEventIndex ? formattedData[nextEventIndex - 1]?.[1] ?? [] : 0;

  const coin: any = Object.values(tokenPrice?.coins ?? {})[0]
  const mcap = mcapRes?.[`coingecko:${res.gecko_id}`]?.mcap ?? 0
  const float = (isNaN(coin.price) || mcap == 0) ? null : mcap / coin.price
  const proportion = float == null ? null : (formattedData[nextEventIndex][1] - circSupply) / float

  const nextEvent =
    nextEventIndex && formattedData[nextEventIndex]
      ? { 
          date: formattedData[nextEventIndex][0], 
          toUnlock: formattedData[nextEventIndex][1] - circSupply, 
          proportion
        }
      : null;
  const totalLocked = maxSupply - circSupply;

  return {
    token,
    tokenPrice,
    sources: res.metadata.sources,
    protocolId,
    name: res.name,
    circSupply,
    totalLocked,
    maxSupply,
    nextEvent,
    gecko_id: res.gecko_id,
    mcap,
    events:
      res.metadata.events
        ?.map(({ description, timestamp, noOfTokens }: { description: string; timestamp: string, noOfTokens:number[] }) => ({
          timestamp: Number(timestamp),
          description,
          noOfTokens
        }))
        .sort(
          (a: { description: string; timestamp: number }, b: { description: string; timestamp: number }) =>
            a.timestamp - b.timestamp
        ) ?? [],
  };
};

const handler = async (_event: any): Promise<IResponse> => {
  const allProtocols = (await getR2(`emissionsProtocolsList`).then((res) => JSON.parse(res.body!))) as string[];
  const data = await Promise.all(
    allProtocols.filter((p) => p !== "frax-share").map((protocol) => fetchProtocolEmissionData(protocol))
  );
  return successResponse(
    data.sort((a, b) => b.mcap - a.mcap),
    10 * 60
  ); // 10 mins cache
};

export default wrap(handler);

async function main() {
  let a = await fetchProtocolEmissionData('moonbeam')
  return
}
main() // ts-node defi/src/getEmissions.ts