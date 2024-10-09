import { AdaptorsConfig } from "../types";

export default {
  // "logx": {
  //   enabled: false,
  //   id: "3396",
  //   protocolsData: {
  //     "logx-aggregator": {
  //       enabled: false,
  //       id: "3396",
  //     }
  //   }
  // },
  "mux-protocol": {
    "id": "2254",
    "protocolsData": {
      "mux-protocol-agge": {
        "id": "5054",
      }
    },
  },
  "rage-trade": {
    "id": "4447",
  },
  "unidex-agg-perp": {
    "id": "5012"
  },
  "vooi": {
    "id": "4655"
  },
  "perpie": {
    "id": "4817",
    protocolsData: {
      "derivatives": {
        "id": "4817"
      }
    }
  },
  "bitoro": {
    "id": "4841",
    cleanRecordsConfig: {
      genuineSpikes: {
        "1724198400": true,
        "1724284800": true,
        "1724371200": true,
        "1724457600": true,
        "1724544000": true,
        "1724630400": true,
      }
    }
  },
  "kwenta": {
    "id": "2981"
  },
  "flat-money": {
    "id": "4503"
  },
  "sharpe-perp": {
    "id": "5165"
  }
} as AdaptorsConfig;
