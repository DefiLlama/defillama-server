import { AdaptorsConfig } from "../types";

export default {
  "jupiter-aggregator": {
    enabled: true,
    id: "2141",
  },
  "dexible": {
    enabled: true,
    disabled: true,
    startFrom: 1630022400,
    id: "2249",
    parentId: "2249",
    protocolsData: {
      Dexible_v2: {
        disabled: true,
        id: "2249",
        enabled: true,
        displayName: "Dexible V2",
      },
    },
  },
  "deflex": {
    enabled: true,
    id: "2420",
  },
  // "dforce": {
  //   enabled: true,
  //   id: "123",
  // },
  "plexus": {
    enabled: true,
    id: "2740",
  },
  "avnu": {
    enabled: true,
    id: "3154",
  },
  "bitkeep": {
    enabled: true,
    id: "3207",
  },
  "logx": {
    enabled: false,
    id: "3396",
  },
  "jumper-exchange": {
    enabled: true,
    id: "3524",
    cleanRecordsConfig: {
      genuineSpikes: {
        "1698883200": true,
      },
    },
  },
  "slingshot": {
    enabled: true,
    id: "3681",
  },
  "caviarnine": {
    parentId: "CaviarNine",
    enabled: true,
    id: "3645",
    protocolsData: {
      aggregator: {
        id: "3645",
        enabled: true,
      },
    },
  },
  "aggre": {
    enabled: true,
    id: "3809",
  },
  "llamaswap": {
    enabled: false,
    id: "3847",
  },
  // "openocean": {
  //   enabled: false,
  //   id: "533",
  // },
  "arcane-dex": {
    enabled: true,
    id: "3885",
  },
  "1inch-agg": {
    enabled: true,
    id: "189",
  },
  // "zrx": {
  //   enabled: true,
  //   id: "2116",
  // },
  "cowswap": {
    enabled: true,
    id: "2643",
  },
  "kyberswap": {
    enabled: true,
    id: "3982",
  },
  "yield-yak": {
    enabled: true,
    id: "475",
  },
  "bebop": {
    enabled: true,
    id: "3927",
  },
  "dodo-agg": {
    enabled: true,
    id: "146",
  },
  "paraswap": {
    enabled: true,
    id: "894",
  },
  "tokenlon-agg": {
    enabled: true,
    id: "405",
  },
  "aftermath-aggregator": {
    enabled: true,
    id: "3981",
  },
  "dexhunter": {
    enabled: true,
    id: "3979",
  },
  "conveyor": {
    enabled: true,
    id: "3980",
  },
} as AdaptorsConfig;
