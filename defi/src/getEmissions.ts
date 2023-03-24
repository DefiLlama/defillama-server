import fetch from "node-fetch";
import { protocols } from "../emissions-adapters/protocols/protocolsArray";
import protocolsList from "./protocols/data";
import { getR2 } from "./utils/r2";
import { wrap, IResponse, successResponse } from "./utils/shared";

const fetchProtocolEmissionData = async (protocol: string) => {
  const res = await getR2(`emissions/${protocol}`).then((res) => (res.body ? JSON.parse(res.body) : null));

  if (!res) {
    throw new Error(`protocol '${protocol}' has no chart to fetch`);
  }

  const protocolId = res.metadata.protocolIds?.[0] ?? null;

  const protocolName = protocolId ? protocolsList.find((p) => p.id === protocolId)?.name : null;

  const data: { [date: number]: number } = {};

  res.data.forEach((item: { data: Array<{ timestamp: number; unlocked: number }> }) => {
    item.data.forEach((value) => {
      data[value.timestamp] = (data[value.timestamp] || 0) + value.unlocked;
    });
  });

  const now = Math.floor(Date.now() / 1000);
  const formattedData = Object.entries(data);
  const maxSupply = formattedData[formattedData.length - 1][1];
  const nextEventIndex = formattedData.findIndex(([date]) => Number(date) > now);
  const circSupply = nextEventIndex ? formattedData[nextEventIndex - 1]?.[1] ?? [] : 0;
  const nextEvent =
    nextEventIndex && formattedData[nextEventIndex]
      ? { date: formattedData[nextEventIndex][0], toUnlock: formattedData[nextEventIndex][1] - circSupply }
      : null;
  const totalLocked = maxSupply - circSupply;

  return {
    token: res.metadata.token,
    sources: res.metadata.sources,
    protocolId,
    name: protocolName || protocol,
    circSupply,
    totalLocked,
    maxSupply,
    nextEvent,
  };
};

const handler = async (event: any): Promise<IResponse> => {
  const data = await Promise.all(protocols.map((protocol) => fetchProtocolEmissionData(protocol)));
  return successResponse(data, 10 * 60); // 10 mins cache
};

export default wrap(handler);
