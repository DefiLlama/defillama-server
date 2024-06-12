import getTokenPrices from "./aktionariat";

export function aktionariat(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "ethereum",
      'https://gateway-arbitrum.network.thegraph.com/api/[api-key]/subgraphs/id/2ZoJCp4S7YP7gbYN2ndsYNjPeZBV1PMti7BBoPRRscNq',
      timestamp,
      ["0xb4272071ecadd69d933adcd19ca99fe80664fc08"] // ignore only xchf, other stable pairings are not used 
    ),
    getTokenPrices(
      "optimism",
      'https://gateway-arbitrum.network.thegraph.com/api/[api-key]/subgraphs/id/3QfEXbPfP23o3AUzcmjTfRtUUd4bfrFj3cJ4jET57CTX',
      timestamp,
      ["0xe4f27b04cc7729901876b44f4eaa5102ec150265"] // ignore only xchf, other stable pairings are not used
    ),
  ]);
}