import { initPG, storeHistoricalPG, storeMetadataPG, storeFundingHistoryPG } from "./db";
import { getContractId, getContractMetadata } from "./constants";
import { sendMessage } from "../../utils/discord";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";

export interface PerpsDataEntry {
    contract: string;
    venue: string;
    openInterest: number;
    volume24h: number;
    price: number;
    priceChange24h: number;
    fundingRate: number;
    premium: number;
    cumulativeFunding: number;
    data: { [key: string]: any };
}

// Store historical perps data to PG
export async function storeHistorical(res: {
    data: { [id: string]: PerpsDataEntry };
    timestamp: number;
}): Promise<void> {
    const { data, timestamp } = res;
    if (Object.keys(data).length === 0) return;

    const inserts: any[] = [];
    await runInPromisePool({
        items: Object.keys(data),
        concurrency: 5,
        processor: async (id: string) => {
            const entry = data[id];

            if (isNaN(timestamp) || !id) {
                if (process.env.RWA_WEBHOOK) {
                    await sendMessage(`ERROR ON PERPS ID ${id}`, process.env.RWA_WEBHOOK, false);
                }
                throw new Error(`ERROR ON PERPS ID ${id}`);
            }

            inserts.push({
                timestamp,
                id,
                open_interest: entry.openInterest,
                volume_24h: entry.volume24h,
                price: entry.price,
                price_change_24h: entry.priceChange24h,
                funding_rate: entry.fundingRate,
                premium: entry.premium,
                cumulative_funding: entry.cumulativeFunding,
                data: JSON.stringify(entry.data),
            });
        },
    });

    await initPG();
    await storeHistoricalPG(inserts, timestamp);
}

// Store metadata for all markets
export async function storeMetadata(res: {
    data: { [id: string]: PerpsDataEntry };
}): Promise<void> {
    const { data } = res;
    if (Object.keys(data).length === 0) return;

    const inserts = Object.keys(data).reduce((acc: any[], id: string) => {
        const entry = data[id];
        const metadata = getContractMetadata(entry.contract);
        if (!metadata) return acc; // skip markets without spreadsheet metadata

        acc.push({
            id,
            data: JSON.stringify({
                contract: entry.contract,
                venue: entry.venue,
                ...metadata,
            }),
        });
        return acc;
    }, []);

    await initPG();
    await storeMetadataPG(inserts);
}

// Store funding history entries
export async function storeFundingHistory(entries: Array<{
    timestamp: number;
    contract: string;
    venue: string;
    fundingRate: number;
    premium: number;
    openInterest: number;
    fundingPayment: number;
}>): Promise<void> {
    if (!entries.length) return;

    const inserts = entries.map((e) => ({
        timestamp: e.timestamp,
        id: getContractId(e.contract),
        coin: e.contract,
        venue: e.venue,
        funding_rate: e.fundingRate,
        premium: e.premium,
        open_interest: e.openInterest,
        funding_payment: e.fundingPayment,
    }));

    await initPG();
    await storeFundingHistoryPG(inserts);
}
