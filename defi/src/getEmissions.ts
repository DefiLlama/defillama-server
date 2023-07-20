import fetch from "node-fetch";
import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse } from "./utils/shared";

type CoreEmissionData = {
  res: any;
  protocolId?: string;
  data: any;
  price?: number;
  mcap?: number;
};

const fetchProtocolData = async (protocol: string): Promise<CoreEmissionData> => {
  let protocolData: CoreEmissionData = { res: "", data: "" };
  let res: any;
  try {
    res = await getR2(`emissions/${protocol}`).then((res) => (res.body ? JSON.parse(res.body) : null));
  } catch {
    console.log(`${protocol} has no emissions in R2`);
    return protocolData;
  }

  protocolData.protocolId = res.metadata.protocolIds?.[0] ?? null;

  const data: { [date: number]: number } = {};

  if ((res.documentedData?.data ?? res.data) == null) {
    console.log(`${protocol} null 1`);
  }

  try {
    (res.documentedData?.data ?? res.data).forEach((item: { data: Array<{ timestamp: number; unlocked: number }> }) => {
      if (item.data == null) {
        console.log(`${protocol} null 2`);
      }
      item.data.forEach((value) => {
        data[value.timestamp] = (data[value.timestamp] || 0) + value.unlocked;
      });
    });
  } catch {
    console.error(`${protocol} failed`);
    return protocolData;
  }

  protocolData.data = data;
  protocolData.res = res;
  return protocolData;
};
const fetchCoinsApiData = async (protocols: any[]): Promise<void> => {
  for (let i = 0; i < protocols.length; i = i + 20) {
    const tokens: string = protocols
      .slice(i, Math.min(i + 20, protocols.length))
      .reduce((p: string, c: CoreEmissionData) => `${p},${c.res.metadata.token}`, "")
      .slice(1);
    const coins: string[] = protocols
      .slice(i, Math.min(i + 20, protocols.length))
      .map((p: CoreEmissionData) => `coingecko:${p.res.gecko_id}`)
      .filter((p: string) => p);

    const [tokenPrices, mcapRes] = await Promise.all([
      fetch(`https://coins.llama.fi/prices/current/${tokens}?searchWidth=4h`).then((res) => res.json()),
      fetch("https://coins.llama.fi/mcaps", {
        method: "POST",
        body: JSON.stringify({
          coins,
        }),
      }).then((r) => r.json()),
    ]);

    protocols.map((p: any) => {
      if (p.res.metadata.token in tokenPrices.coins) p.price = tokenPrices.coins[p.res.metadata.token].price;
      if (p.res.gecko_id in mcapRes) p.mcap = mcapRes[p.res.gecko_id];
    });
  }
};
const fetchProtocolEmissionData = async (protocol: CoreEmissionData) => {
  const now = Math.floor(Date.now() / 1000);
  const formattedData: any[] = Object.values(protocol.data);
  const maxSupply: any = formattedData[formattedData.length - 1];
  const nextEventIndex = formattedData.findIndex(([date]) => Number(date) > now);
  const circSupply = nextEventIndex != -1 ? formattedData[nextEventIndex - 1]?.[1] ?? [] : 0;

  const mcap = protocol.mcap ?? 0;
  const float = protocol.price == null || isNaN(protocol.price) || mcap == 0 ? null : mcap / protocol.price;
  const proportion =
    !float || nextEventIndex == -1 ? null : Math.max((formattedData[nextEventIndex][1] - circSupply) / float, 0);

  const nextEvent =
    nextEventIndex && formattedData[nextEventIndex]
      ? {
          date: formattedData[nextEventIndex][0],
          toUnlock: Math.max(formattedData[nextEventIndex][1] - circSupply, 0),
          proportion,
        }
      : null;
  const totalLocked = maxSupply - circSupply;

  return {
    token: protocol.res.metadata.token,
    tokenPrice: protocol.price,
    sources: protocol.res.metadata.sources,
    protocolId: protocol.protocolId,
    name: protocol.res.name,
    circSupply,
    totalLocked,
    maxSupply,
    nextEvent,
    gecko_id: protocol.res.gecko_id,
    mcap,
    events:
      protocol.res.metadata.events
        ?.map(
          ({
            description,
            timestamp,
            noOfTokens,
          }: {
            description: string;
            timestamp: string;
            noOfTokens: number[];
          }) => ({
            timestamp: Number(timestamp),
            description,
            noOfTokens,
          })
        )
        .sort(
          (a: { description: string; timestamp: number }, b: { description: string; timestamp: number }) =>
            a.timestamp - b.timestamp
        ) ?? [],
  };
};

const handler = async (_event: any): Promise<IResponse> => {
  const allProtocols = (await getR2(`emissionsProtocolsList`).then((res) => JSON.parse(res.body!))) as string[];
  const r2Data: CoreEmissionData[] = (await Promise.all(allProtocols.map((p) => fetchProtocolData(p)))).filter(
    (d) => d.res != "" && d.data != ""
  );
  await fetchCoinsApiData(r2Data);
  const data = await Promise.all(r2Data.map((d: CoreEmissionData) => fetchProtocolEmissionData(d)));
  return successResponse(
    data.sort((a, b) => b.mcap - a.mcap),
    10 * 60
  ); // 10 mins cache
};

export default wrap(handler);
handler({}); // ts-node src/getEmissions.ts
