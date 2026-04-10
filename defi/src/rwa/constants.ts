import protocols from "../protocols/data";
import entities from "../protocols/entities";
import treasuries from "../protocols/treasury";

export const excludedProtocolCategories: string[] = ["CEX"];

export const unsupportedChains: string[] = [];


export const protocolIdMap: { [id: string]: string } = {};
export const categoryMap: { [category: string]: string } = {};
[...protocols, ...entities, ...treasuries].map((protocol: any) => {
  protocolIdMap[protocol.id] = protocol.name;
  categoryMap[protocol.id] = protocol.category;
});

export const MCAP_EXCLUDED_HOLDERS_BY_PROJECT: {
  [projectId: string]: { [chainSlug: string]: string[] };
} = {
  // BackedFi (protocol 3467) — working capital + treasury/cold wallet
  '3467': {
    ethereum: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD', '0x43624c744A4AF40754ab19b00b6f681Ca56F1E5b'],
    polygon: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD', '0x43624c744A4AF40754ab19b00b6f681Ca56F1E5b'],
    xdai: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD', '0x43624c744A4AF40754ab19b00b6f681Ca56F1E5b'],
    bsc: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD', '0x43624c744A4AF40754ab19b00b6f681Ca56F1E5b'],
    avax: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD', '0x43624c744A4AF40754ab19b00b6f681Ca56F1E5b'],
    fantom: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD', '0x43624c744A4AF40754ab19b00b6f681Ca56F1E5b'],
    base: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD', '0x43624c744A4AF40754ab19b00b6f681Ca56F1E5b'],
    arbitrum: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD', '0x43624c744A4AF40754ab19b00b6f681Ca56F1E5b'],
    sonic: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD', '0x43624c744A4AF40754ab19b00b6f681Ca56F1E5b'],
    crossfi: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD', '0x43624c744A4AF40754ab19b00b6f681Ca56F1E5b'],
  },
  // xStocks (protocol 6378) — pre-minted token balances
  '6378': {
    ethereum: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD'],
    polygon: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD'],
    xdai: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD'],
    bsc: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD'],
    avax: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD'],
    fantom: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD'],
    base: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD'],
    arbitrum: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD'],
    solana: ['S7vYFFWH6BjJyEsdrPQpqpYTqLTrPRK6KW3VwsJuRaS'],
    mantle: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD'],
    ink: ['0x5F7A4c11bde4f218f0025Ef444c369d838ffa2aD'],
  },
};