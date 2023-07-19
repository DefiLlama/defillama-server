import fetch from "node-fetch";
import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse } from "./utils/shared";

const fetchProtocolEmissionData = async (protocol: string) => {
  let res: any;
  try {
    res = await getR2(`emissions/${protocol}`).then((res) =>
      res.body ? JSON.parse(res.body) : null,
    );
    // const res = await fetch(`https://api.llama.fi/emission/${protocol}`)
    //   .then((res) => res.json())
    //   .then((res) => (res.body ? JSON.parse(res.body) : null));
  } catch {
    console.log(`${protocol} has no emissions in R2`);
    return;
  }

  const protocolId = res.metadata.protocolIds?.[0] ?? null;

  const data: { [date: number]: number } = {};

  if ((res.documentedData?.data ?? res.data) == null) {
    console.log(`${protocol} null 1`)
  }

  try { 
    (res.documentedData?.data ?? res.data).forEach((item: { data: Array<{ timestamp: number; unlocked: number }> }) => {
      if (item.data == null) {
        console.log(`${protocol} null 2`)
      }
      item.data.forEach((value) => {
        data[value.timestamp] = (data[value.timestamp] || 0) + value.unlocked;
      });
    });
  } catch {
    console.error(`${protocol} failed`)
    return
  }

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
  const circSupply = nextEventIndex != -1 ? formattedData[nextEventIndex - 1]?.[1] ?? [] : 0;

  const coin: any = Object.values(tokenPrice?.coins ?? {})[0]
  const mcap = mcapRes?.[`coingecko:${res.gecko_id}`]?.mcap ?? 0
  const float = (coin == null ||  isNaN(coin.price) || mcap == 0) ? null : mcap / coin.price
  const proportion = !float || nextEventIndex == -1 ? null : Math.max((formattedData[nextEventIndex][1] - circSupply) / float, 0);

  const nextEvent =
    nextEventIndex && formattedData[nextEventIndex]
      ? { 
          date: formattedData[nextEventIndex][0], 
          toUnlock: Math.max(formattedData[nextEventIndex][1] - circSupply, 0),
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
  const data: any[] = (await Promise.all(
    allProtocols.map((protocol) => fetchProtocolEmissionData(protocol))
  )).filter((d) => d != null);
  return successResponse(
    data.sort((a, b) => b.mcap - a.mcap),
    10 * 60
  ); // 10 mins cache
};

export default wrap(handler);
//handler({}) // ts-node src/getEmissions.ts