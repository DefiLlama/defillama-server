import * as sdk from "@defillama/sdk";
import getTokenPrices from "./aktionariat";

const MAINNET_SUBGRAPH_ID = "6PRcMNb9RCczH7aAnWvbw7pHgPWmziVsYjwgUFBeE3mR";

export function aktionariat(timestamp: number = 0) {
  return getTokenPrices("ethereum", sdk.graph.modifyEndpoint(MAINNET_SUBGRAPH_ID), timestamp);
}