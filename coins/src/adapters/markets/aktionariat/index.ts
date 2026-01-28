import * as sdk from "@defillama/sdk";
import getTokenPrices from "./aktionariat";

export function aktionariat(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "ethereum",
      sdk.graph.modifyEndpoint('2ZoJCp4S7YP7gbYN2ndsYNjPeZBV1PMti7BBoPRRscNq'),
      timestamp,
      ["0xb4272071ecadd69d933adcd19ca99fe80664fc08", "0xB58E61C3098d85632Df34EecfB899A1Ed80921cB"] // ignore xchf and zchf
    ),
  ]);
}