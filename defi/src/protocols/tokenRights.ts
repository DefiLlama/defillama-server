
import type { TokenRights } from "./types";

// id should protocol or parent protocol id
export default {
  "parent#uniswap": {
    rights: [
      { label: "Governance", hasRight: true, details: "Voting scoped to protocol upgrades. Proposal creation requires 1M UNI" },
      { label: "Treasury", hasRight: false },
      { label: "Revenue", hasRight: false },
    ],
    governanceData: {
      rights: "LIMITED",
      details: "Voting scoped to protocol upgrades. Proposal creation requires 1M UNI",
      feeSwitchStatus: "PENDING",
      feeSwitchDetails: "Proposal pending to burn 0.05% of v2 fees",
      links: [
        { label: "View UNIfication Announcement", url: "" }, // fill
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
      primaryValueAccrual: "Buybacks - Protocol purchases UNI tokens on the open market",
    },
    tokenAlignment: {
      fundraising: "EQUITY",
      raiseDetailsLink: { label: "View Raise Details", url: "" }, // fill
      associatedEntities: ["DAO", "Labs (Equity)", "Foundation"],
      equityRevenueCapture: "ACTIVE",
      equityStatement: "After UNIfication proposal passes, revenue will not flow to equity holders",
    },
    resources: [
      { label: "Foundation Multisig", address: "0xe571dC7A558bb6D68FfE264c3d7BB98B0C6C73fC" },
      { label: "Transparency Report", note: "Q3 2025 Financial Report" },
    ],
  }
} as {
  [id: string]: TokenRights
};