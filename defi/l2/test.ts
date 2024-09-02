import fetch from "node-fetch";
import { FinalData } from "./types";
import { getCurrentUnixTimestamp } from "../src/utils/date";
import { sendMessage } from "../src/utils/discord";
import { allChainKeys, zero } from "./constants";

export async function verifyChanges(chains: FinalData) {
  const res = await fetch(`https://api.llama.fi/chain-assets/chains?apikey=${process.env.COINS_KEY}`).then((r) =>
    r.json()
  );
  let message: string = ``;
  const hours = ((getCurrentUnixTimestamp() - res.timestamp) / (60 * 60)).toFixed(1);

  Object.keys(chains).map((chain: string) => {
    const allNew = chains[chain];
    const allOld = res[chain];
    if (!allOld) return;

    const totalNew = allNew.total.total;
    const totalOld = allOld.total.total;
    const forwardChange = totalOld != "0" ? (100 * Math.abs(totalNew - totalOld)) / totalOld : 0;
    const backwardChange = totalNew != 0 ? (100 * Math.abs(totalNew - totalOld)) / totalNew : 0;
    if (forwardChange < 100 || backwardChange < 100) return;

    message += `\n${chain} has had a ${totalNew > totalOld ? "increase" : "decrease"} of ${forwardChange.toFixed(
      0
    )}% in ${hours}`;
  });

  if (!message.length) return;

  // await sendMessage(message, process.env.CHAIN_ASSET_WEBHOOK!);
  throw new Error(message);
}
export function flagChainErrors(chains: FinalData) {
  let message: string = ``;
  allChainKeys.map((c: string) => {
    if (c in chains) return;
    message += `${c}, `;
  });

  if (!message.length) return;

  message = message.slice(0, -1) + `adapters have failed`;

  throw new Error(message);
}
