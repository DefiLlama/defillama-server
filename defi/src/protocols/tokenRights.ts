import type { TokenRights } from "./types";

// id should protocol or parent protocol id
export default {
  "parent#uniswap": {
    rights: [
      {
        label: "Governance",
        hasRight: true,
        details:
          "Voting scoped to protocol upgrades. Proposal creation requires 1M UNI",
      },
      { label: "Treasury", hasRight: false },
      { label: "Revenue", hasRight: false },
    ],
    governanceData: {
      rights: "LIMITED",
      details:
        "Voting scoped to protocol upgrades. Proposal creation requires 1M UNI",
      feeSwitchStatus: "PENDING",
      feeSwitchDetails: "Proposal pending to burn 0.05% of v2 fees",
      links: [
        {
          label: "View UNIfication Announcement",
          url: "https://blog.uniswap.org/unification",
        },
      ],
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "ACTIVE",
      burnSources: [
        "Portion of swap fees directed to UNI burns",
        "85% of sequencer revenue used for burns",
        "Protocol Fee Discount Auctions revenue burned",
        "Aggregator hooks revenue burned",
      ],
      primaryValueAccrual:
        "Buybacks - Protocol purchases UNI tokens on the open market",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: {
        label: "View Raise Details",
        url: "https://x.com/Uniswap/status/1580532185597026306?s=20",
      },
      associatedEntities: ["DAO", "Labs (Equity)", "Foundation"],
      equityRevenueCapture: "PARTIAL",
      equityStatement:
        "After UNIfication proposal passes, revenue will not flow to equity holders",
    },
    resources: [
      {
        label: "Foundation Multisig",
        address: "0xe571dC7A558bb6D68FfE264c3d7BB98B0C6C73fC",
      },
      {
        label: "Transparency Report",
        note: "Q3 2025 Financial Report",
        url: "https://www.uniswapfoundation.org/blog/q3-2025-financial-report",
      },
    ],
  },

  "parent#aerodrome": {
    rights: [
      {
        label: "Governance",
        hasRight: true,
        details: "Limited to emissions / liquidity (via veAERO)",
      },
      { label: "Treasury", hasRight: true, details: "veAERO" },
      { label: "Revenue", hasRight: true, details: "veAERO" },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Limited to emissions / liquidity (via veAERO)",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "Equivalent via emissions",
      links: [{ label: "Aerodrome App", url: "https://aerodrome.finance/" }],
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "NONE",
      burnSources: [],
      primaryValueAccrual:
        "Protocol Revenue Share - Fees & protocol emissions are issued to veAERO holders",
    },
    tokenAlignment: {
      fundraising: "NONE",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["Labs (DevCo)", "DAO"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
    resources: [
      {
        label: "Foundation / Vote Power Wallet",
        address: "0xbde0c70bdc242577c52dfad53389f82fd149ea5a",
      },
    ],
  },

  "parent#raydium": {
    rights: [
      {
        label: "Governance",
        hasRight: true,
        details: "Limited to parameters; full governance planned (per docs)",
      },
      { label: "Treasury", hasRight: true, details: "RAY" },
      { label: "Revenue", hasRight: true, details: "RAY" },
    ],
    governanceData: {
      rights: "LIMITED",
      details:
        "Limited to parameters; full governance planned according to documentation",
      feeSwitchStatus: "ON",
      feeSwitchDetails:
        "12% of 0.25% swap fees fund RAY buybacks, 4% to treasury",
      links: [{ label: "Raydium Docs", url: "https://docs.raydium.io/raydium" }],
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      burnSources: [],
      primaryValueAccrual:
        "Buybacks - 12% of trading fees go to RAY token buybacks for programmatic purchases",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["Labs (DevCo)", "DAO"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
    resources: [
      {
        label: "Treasury / Buyback Address (as provided)",
        address: "HLksszpjGgiRbyumXyQe5VpmJLuJEnf6YcRzghyDc8Fo",
      },
    ],
  },

  "parent#jito": {
    rights: [
      {
        label: "Governance",
        hasRight: true,
        details: "Proposal submission requires 250,000 JTO",
      },
      { label: "Treasury", hasRight: true, details: "JTO" },
      { label: "Revenue", hasRight: false },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Proposal submission requires 250,000 JTO",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "DAO receives 100% block engine fees",
      links: [
        {
          label: "Jito Governance Docs",
          url: "https://www.jito.network/docs/governance/the-jito-governance-token-jto/",
        },
      ],
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "NONE",
      burnSources: [],
      primaryValueAccrual: "Governance power over the Treasury's fee streams",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: {
        label: "View Raise Details",
        url: "https://x.com/jito_labs/status/1557749425824342016?s=20",
      },
      associatedEntities: ["DAO", "Labs (Equity)", "Foundation"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "Revenue does not flow to equity holders",
    },
    resources: [
      {
        label: "Foundation Multisig",
        address: "8sjM83a4u2M8YZYshLGKzYxh1VHFfbgtaytwaoEg4bUJ",
      },
    ],
  },
    "parent#jupiter": {
    rights: [
      { label: "Governance", hasRight: true, details: "JUP" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false },  // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Voting paused until 2026. Team holds 20% voting power",
      feeSwitchStatus: "OFF",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - 50% of revenue (12.5% of total fees) goes to JUP holders through buybacks",
    },
    tokenAlignment: {
      fundraising: "NONE",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["DAO", "Other"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
    resources: [
      { label: "Foundation Multisig / Address", address: "CPZmKkAhD2wv1Z21EUZvdH8ZeSD13geAnSfyVBwcW8XK" },
      { label: "Latest Treasury / Token Report", url: "https://discuss.jup.ag/t/jup-community-audit-feb-2025/34764/1" },
    ],
  },

  "parent#maple": {
    rights: [
      { label: "Governance", hasRight: true, details: "stSYRUP" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false },  // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "No broad treasury / upgrade voting",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "25% fees to strategic fund for buybacks",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - 20% of revenues are used (via DAO votes) to buy back SYRUP and distribute to stakers",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["DAO", "Labs (DevCo)", "Equity"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
    resources: [
      { label: "Foundation Multisig / Address", address: "0xd6d4Bcde6c816F17889f1Dd3000aF0261B03a196" },
      { label: "Latest Treasury / Token Report", url: "https://maple.finance/insights/q2-2025-maple-market-update" },
    ],
  },

  "parent#dydx": {
    rights: [
      { label: "Governance", hasRight: true, details: "sDYDX" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: true, details: "DYDX" },
    ],
    governanceData: {
      rights: "FULL",
      details:
        "2k min DYDX deposit for proposals; can vote on text, community spending, parameter changes, & software upgrades",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "75% fees for buybacks",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - 75% of net protocol revenue is allocated to the Treasury and used toward DYDX buyback program",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["Equity", "Foundation", "DAO"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
    resources: [
      { label: "Foundation Multisig / Address", address: "dydx15ztc7xy42tn2ukkc0qjthkucw9ac63pgp70urn" },
      {
        label: "Latest Treasury / Token Report",
        url: "https://www.dydx.foundation/blog/dydx-ecosystem-semi-annual-report-h1-2025",
      },
    ],
  },

  "parent#euler": {
    rights: [
      { label: "Governance", hasRight: true, details: "EUL" },
      { label: "Treasury", hasRight: true, details: "EUL" },
      { label: "Revenue", hasRight: true, details: "EUL" },
    ],
    governanceData: {
      rights: "FULL",
      details: "Voting available on upgrades, treasury, revenue; no thresholds",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "50% fees to EUL buybacks",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Protocol Revenue Share - 50% of net protocol revenue is auctioned for EUL and sent to the DAO treasury for governance-directed use",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["DAO", "Foundation"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
    resources: [
      { label: "Foundation Multisig / Address", address: "0x967B10c27454CC5b1b1Eeb163034ACdE13Fe55e2" },
      { label: "Latest Treasury / Token Report", url: "https://euler.foundation/transparency." },
    ],
  },

  "parent#etherfi": {
    rights: [
      { label: "Governance", hasRight: true, details: "sETHFI" },
      { label: "Treasury", hasRight: true, details: "Indirect" }, // (indirect)
      { label: "Revenue", hasRight: true, details: "sETHFI" },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Can vote on grants, parameters & upgrades, treasury diversification activities",
      feeSwitchStatus: "ON",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - Portion of protocol revenue allocated for weekly buybacks and remitted to staked ETHFI (sETHFI) holders",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["Labs (DevCo)", "DAO"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
    resources: [
      { label: "Foundation Multisig / Address", address: "0x7A6A41F353B3002751d94118aA7f4935dA39bB53" },
      { label: "Latest Treasury / Token Report", url: "https://dune.com/ether_fi/ethfi-dao" },
    ],
  },

  "parent#hyperliquid": {
    rights: [
      { label: "Governance", hasRight: true, details: "HYPE" },
      { label: "Treasury", hasRight: true, details: "HYPE" },
      { label: "Revenue", hasRight: true, details: "sHYPE" },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Can vote on HIPs (includes upgrades, treasury decisions, other network parameters)",
      feeSwitchStatus: "ON",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - Most protocol fees go to the assistance fund which buys back HYPE tokens",
    },
    tokenAlignment: {
      fundraising: "NONE",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["Foundation"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
    resources: [
      { label: "Foundation Multisig / Address", address: "0xfefefefefefefefefefefefefefefefefefefe" },
      { label: "Latest Treasury / Token Report", url: "https://hyperscreener.asxn.xyz/home" },
    ],
  },

  "parent#ethena": {
    rights: [
      { label: "Governance", hasRight: true, details: "ENA" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: true, details: "sENA, sUSDe" },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Can vote on Committee; expert-level stakeholders govern decision-making",
      feeSwitchStatus: "ON",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "ACTIVE",
      burns: "NONE",
      primaryValueAccrual:
        "Protocol Revenue Share - 100% shared to sENA stakers post-fee switch",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: {
        label: "View Raise Details",
        url: "https://x.com/TheBlock__/status/1758477081833599235?s=20",
      },
      associatedEntities: ["DAO", "Labs (Equity)", "Foundation"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "100% of protocol fees go to token holders",
    },
    resources: [
      { label: "Foundation Multisig / Address", address: "0x3B0AAf6e6fCd4a7cEEf8c92C32DFeA9E64dC1862" },
      {
        label: "Latest Treasury / Token Report",
        url: "https://gov.ethenafoundation.com/t/ethena-s-september-2025-governance-update/704",
      },
    ],
  },

  "parent#curve": {
    rights: [
      { label: "Governance", hasRight: true, details: "veCRV" },
      { label: "Treasury", hasRight: false }, // blank in your row; treat as no explicit right
      { label: "Revenue", hasRight: true, details: "veCRV" },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Limited to emissions / liquidity",
      feeSwitchStatus: "ON",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "ACTIVE",
      burns: "NONE",
      primaryValueAccrual:
        "Protocol Revenue Share - 50% of trading fees distributed weekly to veCRV holders",
    },
    tokenAlignment: {
      fundraising: "NONE",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["Labs (DevCo)", "DAO"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
    resources: [
      { label: "Foundation Multisig / Address", address: "0x467947EE34aF926cF1DCac093870f613C96B1E0c" },
    ],
  },

  "parent#chainlink": {
    rights: [
      { label: "Governance", hasRight: true, details: "LINK" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false },  // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "No formal governance",
      feeSwitchStatus: "OFF",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - Portion of onchain & offchain fees go to purchasing LINK",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["Labs (DevCo)", "DAO", "Foundation"],
      equityRevenueCapture: "PARTIAL",
      equityStatement: "N/A",
    },
    resources: [
      { label: "Foundation Multisig / Address", address: "0x9A709B7B69EA42D5eeb1ceBC48674C69E1569eC6" },
      { label: "Latest Treasury / Token Report", url: "https://blog.chain.link/quarterly-review-q3-2025/" },
    ],
  },
} as {
  [id: string]: TokenRights;
};
