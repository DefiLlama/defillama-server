import { AdaptorsConfig } from "../types";

export default {
  "logx": {
    enabled: false,
    id: "3396",
    protocolsData: {
      "logx-aggregator": {
        enabled: false,
        id: "3396",
      }
    }
  },
  "mux-protocol": {
      "enabled": true,
      "id": "2254",
      "protocolsData": {
          "mux-protocol-agge": {
              "id": "2254",
              "enabled": true,
          }
      },
  },
  "rage-trade": {
    "id":"4447",
    enabled: true,
  },
  "unidex": {
    "enabled": true,
    "id": "1833",
    protocolsData: {
        "unidex-agg-derivative": {
            "enabled": true,
            "id": "1833"
        }
    }
  },
  "vooi": {
    "enabled": true,
    "id": "4655"
  },
  "perpie": {
    "enabled": true,
    "id": "4817",
    protocolsData: {
        "derivatives": {
            "enabled": true,
            "id": "4817"
        }
    }
  },
  "bitoro": {
    "enabled": true,
    "id": "4841"
  },
  "kwenta": {
    "enabled": true,
    "id": "2981"
  }
} as AdaptorsConfig;
