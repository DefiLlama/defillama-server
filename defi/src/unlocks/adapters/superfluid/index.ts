import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { AdapterResult } from "../../types/adapters";
import { request, gql } from "graphql-request";
import abi from "./abi";

type GqlData = {
  receiver: string;
  sender: string;
  token: string;
  start: number;
  flowRate: number;
};
type ChainData = {
  flowRate: number;
  timestamp: number;
  owedDeposit: number;
  deposit: number;
};
const baseUrl: string =
  "https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-";
const chainData: { [chain: string]: { [key: string]: string } } = {
  polygon: {
    subgraphKey: "matic",
    cfa: "0x6EeE6060f715257b970700bc2656De21dEdF074C",
  },
};
export default async function main(chain: any): Promise<AdapterResult[]> {
  const target = chainData[chain].cfa;
  const gqlData: GqlData[] = await getStreamIdentifiers(chain);

  const flows: ChainData[] = await multiCall({
    target,
    abi: abi.getFlow,
    chain,
    calls: gqlData.map((d: GqlData) => ({
      target,
      params: [d.token, d.sender, d.receiver],
    })),
  });

  return gqlData.map((g: GqlData, i: number) => {
    const flow = flows[i];
    const end = Math.floor(
      Number(flow.timestamp) + Number(flow.deposit / flow.flowRate),
    );

    return {
      type: "linear",
      start: g.start,
      end,
      amount: flow.deposit,
      receiver: g.receiver,
      token: g.token,
    };
  });
}
async function getStreamIdentifiers(chain: string): Promise<GqlData[]> {
  let streams: GqlData[] = [];
  let reservereThreshold: number | undefined;
  const subgraph: string = `${baseUrl}${chainData[chain].subgraphKey}`;
  let result: any[] = [];
  result.length = 1000;
  while (result.length == 1000) {
    const lpQuery = gql`
      query { streams(
          first: 1000
          orderBy: currentFlowRate
          where: { 
            ${
              reservereThreshold == undefined
                ? ``
                : `currentFlowRate_lt: "${reservereThreshold}"`
            } 
            currentFlowRate_gt: "0" 
          }) {
            currentFlowRate
            sender { id }
            receiver { id }
            token { id }
            createdAtTimestamp
        }}`;
    result = (await request(subgraph, lpQuery)).streams;
    reservereThreshold = Number(
      result[Math.max(result.length - 1, 0)].currentFlowRate,
    );
    streams.push(
      ...result.map((p: any) => ({
        token: p.token.id,
        sender: p.sender.id,
        receiver: p.receiver.id,
        start: p.createdAtTimestamp,
        flowRate: p.currentFlowRate,
      })),
    );
  }
  return streams;
}
