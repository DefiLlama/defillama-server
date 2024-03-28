import getTokenPrices from "./aktionariat";

export function aktionariat(timestamp: number = 0) {
  console.log("starting aktionariat");
  return Promise.all([
    getTokenPrices(
      "ethereum",
      "https://api.thegraph.com/subgraphs/name/aktionariat/brokerbot",
      timestamp,
      ["0xb4272071ecadd69d933adcd19ca99fe80664fc08"] // ignore only xchf, other stable pairings are not used 
    ),
    getTokenPrices(
      "optimism",
      "https://api.thegraph.com/subgraphs/name/aktionariat/brokerbot-optimism",
      timestamp,
      ["0xe4f27b04cc7729901876b44f4eaa5102ec150265"] // ignore only xchf, other stable pairings are not used
    ),
  ]);
}