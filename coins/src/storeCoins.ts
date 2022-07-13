import { importAdapter } from "./storeToDB/importAdapter";
import protocols from "./storeToDB/data";

async function iterateProtocols(protocolIndexes: number[]) {
  const actions = protocolIndexes
    .map((idx) => protocols[idx])
    .map((protocol) => {
      importAdapter(protocol);
    });

  await Promise.all(actions);
}

export default async (protocolIndexes: number[]) => {
  console.log(protocolIndexes);
  await iterateProtocols(protocolIndexes);
};
