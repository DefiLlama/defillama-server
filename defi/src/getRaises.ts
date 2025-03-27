import { getAllAirtableRecords } from "./utils/airtable";
import { successResponse, wrap, IResponse } from "./utils/shared";

const SECTOR = "Description (very smol)";
const VALUATION = "Valuation (millions)";

const categoryGroups = {
  "Base Layers & Scaling": ["L1", "L2", "Zero Knowledge", "EVM", "Scaling Solutions", "Rollups"],
  "DeFi & CeFi": ["DeFi", "CeFi", "Stablecoins", "CeDeFi", "Centralized Exchange", "Trading", "RWA", "Liquid Staking Protocol", "Payments", "Banking", "Insurance", "Payment gateways", "financial settlement layers"],
  "NFT, Gaming & Metaverse": ["NFT", "Gaming", "Metaverse", "Meme tokens"],
  "Web3 Infrastructure & Tools": ["Infrastructure", "Mining", "Hardware", "Storage", "Hardware", "DePIN", "Oracles", "IoT", "Custody", "Cloud", "Supply Chain", "Healthcare"],
  "Social, DAO & Identity": ["Social Platforms", "DAO Infrastructure", "Digital Identity"],
  "AI, Analytics & Data": ["AI", "Analytics", "Data Platforms", "Big Data"],
  "Security & Audits": ["Smart Contract Audits", "Cybersecurity", "MEV"],
}

const categoryGroupMapping = Object.entries(categoryGroups).reduce((acc, group) => {
  group[1].forEach(category => {
    acc[category] = group[0]
  })
  return acc
}, {} as { [category: string]: string })

export async function getRaisesInternal() {
  let allRecords = await getAllAirtableRecords('appGpVsrkpqsZ9qHH/Raises')

  const formattedRaises = allRecords
    .filter(
      (r) =>
        r.fields["Company name (pls match names in defillama)"] !== undefined &&
        r.fields["Date (DD/MM/YYYY, the correct way)"] !== undefined
    )
    .map((r) => ({
      date: new Date(r.fields["Date (DD/MM/YYYY, the correct way)"]).getTime() / 1000,
      name: r.fields["Company name (pls match names in defillama)"],
      round: r.fields["Round"] ?? null,
      amount: r.fields["Amount raised (millions)"] ?? null,
      chains: r.fields["Chain"] ?? [],
      sector: r.fields[SECTOR]?.endsWith("\n") ? r.fields[SECTOR].slice(-1) : r.fields[SECTOR] || null,
      category: r.fields["General Sector"] ?? null,
      categoryGroup: categoryGroupMapping[r.fields["General Sector"]] ?? null,
      source: r.fields["Source (twitter/news links better because blogposts go down quite often)"],
      leadInvestors: r.fields["Lead Investor"] ?? [],
      otherInvestors: r.fields["Other investors"] ?? [],
      valuation: r.fields[VALUATION]?.endsWith("\n") ? r.fields[VALUATION].slice(-1) : r.fields[VALUATION] || null,
      defillamaId: r.fields["DefiLlama Id"],
    }));
  return { raises: formattedRaises }
}

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  return successResponse(await getRaisesInternal(), 30 * 60);
};

export default wrap(handler);
