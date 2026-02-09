import type { TokenRights } from "./types";

// id should protocol or parent protocol id
export default {
  "parent#uniswap": {
    rights: [
      {
        label: "Governance",
        hasRight: true,
        details: "Voting scoped to protocol upgrades. Proposal creation requires 1M UNI",
      },
      { label: "Treasury", hasRight: false },
      { label: "Revenue", hasRight: false },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Voting scoped to protocol upgrades. Proposal creation requires 1M UNI",
      feeSwitchStatus: "ON",
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
      primaryValueAccrual: "Deflationary Supply Reduction - Protocol purchases UNI tokens on the open market. Portion of swap fees, 85% of sequencer revenue, Protocol Fee Discount Auctions & Aggregator hooks go to UNI burns",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: {
        label: "View Raise Details",
        url: "https://x.com/Uniswap/status/1580532185597026306?s=20",
      },
      associatedEntities: ["DAO", "Labs (Equity)", "Foundation"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "After UNIfication  +proposal passed, revenue no longer flows to equity holders",
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
      feeSwitchDetails: "Protocol fees are issued to veAERO holders, and programmatic buybacks are implemented",
      links: [{ label: "Aerodrome App", url: "https://aerodrome.finance/" }],
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "ACTIVE",
      burns: "NONE",
      burnSources: [],
      primaryValueAccrual: "Protocol Revenue Share - Fees & protocol emissions are issued to veAERO holders",
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
      details: "Limited to parameters; full governance planned according to documentation",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "12% of 0.25% swap fees fund RAY buybacks, 4% to treasury",
      links: [{ label: "Raydium Docs", url: "https://docs.raydium.io/raydium" }],
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      burnSources: [],
      primaryValueAccrual: "Buybacks - 12% of trading fees go to RAY token buybacks for programmatic purchases",
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
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Users stake JUP for vote access on governance proposals. Consistent voting participation is yield-bearing through Jupiter's Active Staking Rewards",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "50% of protocol's take rate fund JUP buybacks and locks them"
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "Buybacks - 50% of revenue (12.5% of total fees) goes to JUP holders through buybacks",
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

  "parent#maple-finance": {
    rights: [
      { label: "Governance", hasRight: true, details: "stSYRUP" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
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

  "parent#lyra": {
    rights: [
      {
        label: "Governance",
        hasRight: true,
        details: "DRV can be staked into stDRV (non-transferable) for onchain governance participation on Derive L2.",
      },
      {
        label: "Treasury",
        hasRight: true,
        details: "stDRV holders can vote on DAO-controlled treasury and ecosystem program parameters.",
      },
      {
        label: "Revenue",
        hasRight: false,
        details: "DRV does not represent equity, ownership, or a direct claim on protocol revenue or profits.",
      },
    ],
    governanceData: {
      rights: "LIMITED",
      details:
        "Governance is executed on Derive L2 via DAO processes (proposal creation, voting, and delegation), subject to DAO-defined rules.",
      feeSwitchStatus: "ON",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Protocol fees are governed by the DAO and may be allocated across protocol operations and ecosystem initiatives, subject to onchain governance.",
    },
    tokenAlignment: {
      fundraising: "UNKNOWN",
      raiseDetailsLink: { label: "Raise Details", url: "" },
      associatedEntities: ["Foundation", "DAO"],
      equityRevenueCapture: "INACTIVE",
      equityStatement:
        "DRV does not represent equity, ownership, or an entitlement to profits of any entity.",
    },
    resources: [
      { label: "Docs", url: "https://docs.derive.xyz" },
      { label: "Website", url: "https://derive.xyz" },
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

  "parent#ether-fi": {
    rights: [
      { label: "Governance", hasRight: true, details: "ETHFI" },
      { label: "Treasury", hasRight: true, details: "ETHFI" }, // (indirect)
      { label: "Revenue", hasRight: true, details: "ETHFI" },
    ],
    governanceData: {
      rights: "FULL",
      details: "Can vote on grants, parameters & upgrades, treasury diversification activities",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "Foundation to utilise a portion of the treasury to conduct buy-backs of ETHFI tokens while the market price is below US $3, up to a total amount of US $50 million",
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
      primaryValueAccrual: "Most protocol fees go to the assistance fund which buys back & burns HYPE tokens",
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
      primaryValueAccrual: "Protocol Revenue Share - 100% shared to sENA stakers post-fee switch",
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

  "parent#curve-finance": {
    rights: [
      { label: "Governance", hasRight: true, details: "veCRV" },
      { label: "Treasury", hasRight: true, details: "veCRV" }, 
      { label: "Revenue", hasRight: true, details: "veCRV" },
    ],
    governanceData: {
      rights: "FULL",
      details: "Any proposal pushed onchain is voted on by veCRV holders",
      feeSwitchStatus: "ON",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "ACTIVE",
      burns: "NONE",
      primaryValueAccrual: "Protocol Revenue Share - 50% of trading fees distributed weekly to veCRV holders, 80% of accrued interest from crvUSD goes to veCRV holders",
    },
    tokenAlignment: {
      fundraising: "NONE",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A
      associatedEntities: ["Labs (DevCo)", "DAO"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
    resources: [{ label: "Foundation Multisig / Address", address: "0x467947EE34aF926cF1DCac093870f613C96B1E0c" }],
  },

  "parent#chainlink": {
    rights: [
      { label: "Governance", hasRight: true, details: "LINK" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
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
      primaryValueAccrual: "Buybacks - Portion of onchain & offchain fees go to purchasing LINK",
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
  "parent#pancakeswap": {
    rights: [
      { label: "Governance", hasRight: true, details: "CAKE" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details:
        "1 CAKE = 1 vote. Only PancakeSwap Core Team can propose Core Proposals, community can propose ideas with 10,000 CAKE balance",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "Burns are active",
      links: [
        { label: "Burn Dashboard", url: "https://pancakeswap.finance/burn-dashboard" },
        {
          label: "Example Proposal",
          url: "https://pancakeswap.finance/voting/proposal/0x79ef496c9737e48d9677a6e291ff2a549dee6729c9996398e453af8ecbf0ceb3",
        },
      ],
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "ACTIVE",
      burnSources: ["Fees from perps", "IFOs", "Prediction / Lottery", "Liquidity pools"],
      primaryValueAccrual: "Deflationary supply reduction",
    },
    tokenAlignment: {
      fundraising: "NONE",
      associatedEntities: ["DAO"],
      equityRevenueCapture: "UNKNOWN",
    },
    resources: [{ label: "Burn Dashboard", url: "https://pancakeswap.finance/burn-dashboard" }],
  },
  "parent#morpho": {
    rights: [
      { label: "Governance", hasRight: true, details: "MORPHO" },
      { label: "Treasury", hasRight: true, details: "MORPHO" },
      { label: "Revenue", hasRight: true, details: "MORPHO" },
    ],
    governanceData: {
      rights: "FULL",
      details: "Morpho DAO has complete governance. Morpho protocol cannot be upgraded",
      feeSwitchStatus: "OFF",
      feeSwitchDetails: "Morpho DAO can activate fee switch with a governance vote",
      links: [
        {
          label: "Aligning around MORPHO",
          url: "https://morpho.org/blog/aligning-around-morpho-the-only-asset-for-morpho/",
        },
      ],
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "Morpho can charge a fee on interest paid by borrowers, decided by DAO",
    },
    tokenAlignment: {
      fundraising: "UNKNOWN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // details on DL
      associatedEntities: ["DAO", "Other"],
      equityRevenueCapture: "INACTIVE",
      equityStatement:
        "Morpho Association is legally prohibited from having shareholders, distributing profits to members, or being sold. All resources must be directed towards stated mission. Morpho will only have one asset: MORPHO",
    },
    resources: [
      { label: "Addresses", url: "https://docs.morpho.org/get-started/resources/addresses/" },
      { label: "Latest Treasury / Token Report", url: "https://morpho.org/blog/morpho-effect-november-2025/" },
    ],
  },
  "182": {
    //lido
    rights: [
      { label: "Governance", hasRight: true, details: "LDO" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details:
        "DAO manages operator selection for permissioned modules, parameter adjustments, and upgrades through a phased governance process. stETH holders can express opposition via withdrawals (dual governance concept)",
      feeSwitchStatus: "OFF",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "N/A",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // Details on DL
      associatedEntities: ["DAO"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "All revenue accrues to DAO",
    },
  },
  "parent#marinade-finance": {
    rights: [
      { label: "Governance", hasRight: true, details: "locked MNDE" },
      { label: "Treasury", hasRight: true, details: "locked MNDE" },
      { label: "Revenue", hasRight: true, details: "locked MNDE" },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "DAO votes on treasury decisions, fee allocations, and protocol upgrades (locked MNDE voting)",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "50% of fees go to buybacks",
      links: [
        {
          label: "Token Exchange Program",
          url: "https://marinade.finance/blog/marinade-dao-executes-token-exchange-program-to-align-with-leading-solana-builders",
        },
      ],
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "Buybacks - 50% of protocol fees go to MNDE buybacks",
    },
    tokenAlignment: {
      fundraising: "NONE",
      raiseDetailsLink: {
        label: "Token Exchange Program",
        url: "https://marinade.finance/blog/marinade-dao-executes-token-exchange-program-to-align-with-leading-solana-builders",
      },
      associatedEntities: ["DAO", "Labs (DevCo)"],
      equityRevenueCapture: "INACTIVE",
      equityStatement:
        "Private equity entities do not accrue protocol fees. Fees flow to Labs for development. Labs equity has no rights over protocol revenue or DAO treasury. Value accrual is focused on MNDE; no plans to launch additional tokens.",
    },
    resources: [{ label: "Foundation Multisig / Address", address: "B56RWQGf9RFw7t8gxPzrRvk5VRmB5DoF94aLoJ25YtvG" }],
  },
  "parent#maker": {
    rights: [
      { label: "Governance", hasRight: true, details: "SKY" },
      { label: "Treasury", hasRight: false },
      { label: "Revenue", hasRight: false },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "SKY can be used for voting or delegating",
      feeSwitchStatus: "UNKNOWN",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "Buybacks - SKY token buybacks; staking rewards for SKY stakers",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // MakerDAO token sales (data on DL)
      associatedEntities: ["DAO"],
      equityRevenueCapture: "INACTIVE",
      equityStatement: "N/A",
    },
  },
  "parent#ondo-finance": {
    rights: [
      { label: "Governance", hasRight: true, details: "ONDO" },
      { label: "Treasury", hasRight: true, details: "ONDO" },
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details:
        "DAO controls protocol, economic parameters, upgrades. 100,000,000 ONDO proposal threshold. No DAO proposals for 18 months",
      feeSwitchStatus: "OFF",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "NONE",
    },
    tokenAlignment: {
      fundraising: "UNKNOWN", // Equity + Token Sale in row; using UNKNOWN to avoid mislabel
      raiseDetailsLink: { label: "Raise Details", url: "" }, // data on DL
      associatedEntities: ["DAO", "Equity", "Foundation"],
      equityRevenueCapture: "UNKNOWN",
      equityStatement: "Foundation manages treasury",
    },
    resources: [
      {
        label: "Foundation Wallet Disclosure",
        url: "https://blog.ondo.foundation/ondo-foundation-group-wallet-address-disclosure/",
      },
    ],
  },
  "6631": {
    //Helium Network
    rights: [
      { label: "Governance", hasRight: false }, // x
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "NONE",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "Portion of revenue goes to buybacks & HNT burns",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "ACTIVE",
      burnSources: ["Automated buybacks & burns dependent on usage"],
      primaryValueAccrual: "Buybacks - Automated buybacks & HNT burns dependent on usage",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // Several rounds raised
      associatedEntities: ["Equity", "Other"],
      equityRevenueCapture: "UNKNOWN",
    },
  },
  "parent#axelar-network": {
    rights: [
      { label: "Governance", hasRight: true, details: "AXL" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "",
      feeSwitchStatus: "OFF",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "NONE",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // Completed equity raises & token sales
      associatedEntities: ["Labs (Equity)", "DAO", "Foundation"],
      equityRevenueCapture: "UNKNOWN",
    },
  },
  "parent#pyth": {
    rights: [
      { label: "Governance", hasRight: true, details: "PYTH" },
      { label: "Treasury", hasRight: true, details: "PYTH" },
      { label: "Revenue", hasRight: true, details: "PYTH" },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Stake PYTH for voting power; DAO controls treasury & revenue",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "33% of revenue flows to DAO treasury & programmatically purchases PYTH",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "Buybacks - 33% of revenue to DAO treasury for monthly buybacks",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: { label: "Raise Details", url: "" },
      associatedEntities: ["DAO"],
      equityRevenueCapture: "UNKNOWN",
    },
  },
  "parent#aave": {
    rights: [
      { label: "Governance", hasRight: true, details: "AAVE" },
      { label: "Treasury", hasRight: true, details: "AAVE" },
      { label: "Revenue", hasRight: true, details: "AAVE" },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Governance includes protocol parameters, treasury management, upgrades & onchain revenue",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "$50m annual budget for token buybacks",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "Buybacks - $50M yearly budget for buybacks",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: {
        label: "Strategic Round (Decrypt)",
        url: "https://decrypt.co/44653/aave-raises-25-million-to-bring-defi-to-institutions",
      },
      associatedEntities: ["DAO", "Labs", "Parent / Holdings Co"],
      equityRevenueCapture: "PARTIAL",
      equityStatement: "Labs owns the interface and offchain revenue",
    },
  },
  "382": {
    //pendle
    rights: [
      { label: "Governance", hasRight: true, details: "sPENDLE" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: true, details: "sPENDLE" },
    ],
    governanceData: {
      rights: "LIMITED",
      details:
        "Lock PENDLE for vePENDLE for voting power, revenue share, LP boosts and governance. sPENDLE has a 14-day unstaking cooldown, or instant redemption for a 5% fee",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "80% of protocol revenue goes to buybacks with distributions to sPENDLE holders",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "ACTIVE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - 80% of protocol revenue goes to PENDLE buybacks and is distributed amongst sPENDLE holders",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // details on DL
      associatedEntities: ["DAO", "Other"],
      equityRevenueCapture: "INACTIVE",
    },
  },
  "parent#meteora": {
    rights: [
      { label: "Governance", hasRight: true, details: "MET" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Portion of trading fees from DLMM and DAMM go to discretionary buybacks",
      feeSwitchStatus: "ON",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "Buybacks - Portion of trading fees from DLMM and DAMM go to discretionary buybacks",
    },
    tokenAlignment: {
      fundraising: "UNKNOWN",
      associatedEntities: ["DevCo"],
      equityRevenueCapture: "UNKNOWN",
    },
    resources: [
      {
        label: "Meteora Buyback Wallet",
        address: "FzULv8pR9Rd7cyVKjVkzmJ1eqEmgwDnzjYyNUcEJtoG9",
      },
    ],
  },
  "5575": {
    // Virtuals Protocol
    rights: [
      { label: "Governance", hasRight: true, details: "veVIRTUAL" },
      { label: "Treasury", hasRight: true, details: "veVIRTUAL" },
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "Portion of fees go to token buybacks & burns",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "ACTIVE",
      burnSources: ["Portion of fees go to token buybacks & burns"],
      primaryValueAccrual: "Buybacks - Portion of fees go to token buybacks & burns",
    },
    tokenAlignment: {
      fundraising: "UNKNOWN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // Raised through PathDAO, before rebranding
      associatedEntities: ["DAO", "DevCo"],
      equityRevenueCapture: "UNKNOWN",
    },
  },
  "parent#kamino-finance": {
    rights: [
      { label: "Governance", hasRight: true, details: "staked KMNO" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "",
      feeSwitchStatus: "OFF",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "N/A",
    },
    tokenAlignment: {
      fundraising: "UNKNOWN",
      associatedEntities: ["Foundation"],
      equityRevenueCapture: "UNKNOWN",
      equityStatement: "Foundation oversees treasury allocations",
    },
  },
  "parent#lombard-finance": {
    rights: [
      { label: "Governance", hasRight: true, details: "BARD" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "",
      feeSwitchStatus: "OFF",
      feeSwitchDetails:
        "As protocol fees grow, Lombard will introduce a structured buyback program designed to reinforce long-term alignment",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "INACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "N/A",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // N/A in row
      associatedEntities: ["Foundation", "Other"],
      equityRevenueCapture: "UNKNOWN",
    },
  },
    "7051": { //metadao
    rights: [
      { label: "Governance", hasRight: true, details: "META" },
      { label: "Treasury", hasRight: true, details: "META" },
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "FULL",
      details: "Futarchy decision markets; market-based voting and fundraising",
      feeSwitchStatus: "OFF",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "N/A",
    },
    tokenAlignment: {
      fundraising: "UNKNOWN",
      associatedEntities: ["DAO"],
      equityRevenueCapture: "UNKNOWN",
      equityStatement: "Revenue flows to DAO treasury",
    },
  },
    "parent#grass": {
    rights: [
      { label: "Governance", hasRight: true, details: "GRASS" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "",
      feeSwitchStatus: "ON",
      feeSwitchDetails:
        "Team announced buybacks from portion of data / infra sales going toward open market purchases",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - Portion of data / infrastructure sales used for open market purchases",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: { label: "Raise Details", url: "" },
      associatedEntities: ["Foundation", "DAO", "Labs", "Other"],
      equityRevenueCapture: "UNKNOWN",
      equityStatement:
        "Foundation is owner-less (no shareholders). Subsidiaries under foundation oversight handle network operations and token distributions (OpCo). DataCo receives 100% of product sale revenue.",
    },
  },
    "2314": { // gate cex
    rights: [
      { label: "Governance", hasRight: true, details: "GT" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details:
        "Not a full DAO. Governance is utility-driven: staking GT on GateChain for validation/rewards and limited participation (e.g., voting on proposals / accessing features).",
      feeSwitchStatus: "OFF",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "ACTIVE",
      burnSources: ["Portion of profits go to token burns"],
      primaryValueAccrual: "Deflationary supply reduction",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" },
      associatedEntities: ["Other"],
      equityRevenueCapture: "ACTIVE",
      equityStatement: "All fees go to Gate Group (Cayman-based exchange)",
    },
  },
    "5181": { // Limitless Exchang
    rights: [
      { label: "Governance", hasRight: true, details: "LMTS" },
      { label: "Treasury", hasRight: false },
      { label: "Revenue", hasRight: false },
    ],
    governanceData: {
      rights: "LIMITED",
      details:
        "Prediction market governance + utility: staking rewards, fee reductions, market creation incentives, ecosystem decisions",
      feeSwitchStatus: "UNKNOWN",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "Buybacks",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" },
      associatedEntities: [],
      equityRevenueCapture: "UNKNOWN",
    },
  },
    "parent#pump": {
    rights: [
      { label: "Governance", hasRight: false }, // x
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // (not specified as token right in row)
    ],
    governanceData: {
      rights: "LIMITED",
      details: "",
      feeSwitchStatus: "ON",
      feeSwitchDetails: "Buybacks are live",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - Most revenue used for open market buybacks; half of PumpSwap revenue is shared with coin creators",
    },
    tokenAlignment: {
      fundraising: "TOKEN",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // on DL
      associatedEntities: ["DevCo"],
      equityRevenueCapture: "UNKNOWN",
    },
  },
   "3107": { // EigenCloud
    rights: [
      { label: "Governance", hasRight: true, details: "EIGEN" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "",
      feeSwitchStatus: "OFF",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual: "N/A",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: { label: "Raise Details", url: "" }, // "$200m+ raised..." (details on DL)
      associatedEntities: ["DAO", "Labs (Equity)", "Foundation"],
      equityRevenueCapture: "PARTIAL",
      equityStatement: "N/A",
    },
  },
  "parent#lighter": {
    rights: [
      { label: "Governance", hasRight: false },
      { label: "Treasury", hasRight: false },
      { label: "Revenue", hasRight: false },
    ],
    governanceData: {
      rights: "NONE",
      details: "Lighter team will share relevant governance updates",
      feeSwitchStatus: "ON",
      feeSwitchDetails:
        "LIT is bought back by the protocol using trading fee revenue. Buybacks are executed via daily 24-hour TWAPs, with the flexibility to use shorter timeframes depending on market conditions",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - LIT is bought back by the protocol using trading fee revenue. Buybacks are executed via daily 24-hour TWAPs, with the flexibility to use shorter timeframes depending on market conditions. Revenues from core DEX product as well as future products and services will be allocated between growth and buybacks depending on market conditions",
    },
    tokenAlignment: {
      fundraising: "UNKNOWN", // Equity + Token Sale in row; using UNKNOWN to avoid mislabel
      raiseDetailsLink: {
        label: "Raise Details",
        url: "",
      }, // Two funding rounds; one in 2024 for $21m and one for $68m @ $1.5b valuation through equity & token warrants
      associatedEntities: ["DevCo", "C-Corp"],
      equityRevenueCapture: "INACTIVE",
      equityStatement:
        "The value created by all Lighter products and services will fully accrue to LIT holders",
    },
      resources: [
      {
        label: "Foundation Multisig",
        address: "0x0000000000000000000000000000000000000000",
      },
      {
        label: "Docs",
        url: "https://docs.lighter.xyz",
      },
    ],
  },
} as {
  [id: string]: TokenRights;
};


/*

  "chain#plasma": {
    rights: [
      { label: "Governance", hasRight: true, details: "XPL" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "",
      feeSwitchStatus: "OFF",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "NONE",
      dividends: "NONE",
      burns: "ACTIVE",
      primaryValueAccrual: "Deflationary supply reduction",
      burnSources: ["Base transaction fees are burned"],
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: { label: "Raise Details", url: "" }, /
      associatedEntities: ["DevCo", "Foundation"],
      equityRevenueCapture: "UNKNOWN",
    },
  },

  */


//once we add the listing , use id not parent#slug

/*  "parent#grass": { 
    rights: [
      { label: "Governance", hasRight: true, details: "GRASS" },
      { label: "Treasury", hasRight: false }, // x
      { label: "Revenue", hasRight: false }, // x
    ],
    governanceData: {
      rights: "LIMITED",
      details: "",
      feeSwitchStatus: "ON",
      feeSwitchDetails:
        "Team announced buybacks from portion of data / infra sales going toward open market purchases",
    },
    holdersRevenueAndValueAccrual: {
      buybacks: "ACTIVE",
      dividends: "NONE",
      burns: "NONE",
      primaryValueAccrual:
        "Buybacks - Portion of data / infrastructure sales used for open market purchases",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: { label: "Raise Details", url: "" },
      associatedEntities: ["Foundation", "DAO", "Labs", "Other"],
      equityRevenueCapture: "UNKNOWN",
      equityStatement:
        "Foundation is owner-less (no shareholders). Subsidiaries under foundation oversight handle network operations and token distributions (OpCo). DataCo receives 100% of product sale revenue.",
    },
  }, */