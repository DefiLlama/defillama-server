import axios from "axios";
import { Write } from "../../utils/dbInterfaces";
import { getConfig } from "../../../utils/cache";
import { addToDBWritesList } from "../../utils/database";
import { getApi } from "../../utils/sdk";

export async function addPendleCrosschainPrices(
    writes: Write[][],
    timestamp: number = 0
): Promise<void> {
    const response: {
        hubPtChainId: number;
        hubPtAddress: string;
        spokePts: {
            spokeChainId: number;
            spokeAddress: string;
        }[];
    }[] = (await getConfig(
        'pendle/v2-crosschain-pt',
        "https://api-v2.pendle.finance/core/v1/cross-pt/all"
    )).result;

    const flat = writes.flat();

    async function addToWrite(chainId: number, address: string, price: number) {
        const chain = getChainFromChainId(chainId);
        if (!chain) return;

        let foundWs: Write[] | null = null;

        for (const ws of writes) {
            if (ws.length === 0) continue;
            if (ws[0].PK.startsWith(`asset#${chain}:`)) {
                foundWs = ws;
            }
        }
        if (!foundWs) {
            writes.push([]);
            foundWs = writes[writes.length - 1];
        }

        const api = await getApi(chain, timestamp);
        const [decimals, symbol] = await api.batchCall([
            {
                target: address,
                abi: 'erc20:decimals',
            },
            {
                target: address,
                abi: 'erc20:symbol',
            }
        ])

        addToDBWritesList(
            foundWs,
            chain,
            address,
            price,
            decimals,
            symbol,
            timestamp,
            'pendle-crosschain',
            0.9
        )
        return;
    }

    for (const item of response) {
        for (const w of flat) {
            if (w.PK.includes(item.hubPtAddress.toLowerCase())) {
                for(const spoke of item.spokePts) {
                    await addToWrite(spoke.spokeChainId, spoke.spokeAddress, w.price!);
                }
                break;
            }
        }
    }
}

function getChainFromChainId(chainId: number): string | null {
    switch (chainId) {
        case 1: return "ethereum";
        case 10: return "optimism";
        case 56: return "bsc";
        case 42161: return "arbitrum";
        case 5000: return "mantle";
        case 146: return "sonic";
        case 8453: return "base";
        case 80094: return "berachain";
        case 999: return "hyperliquid";
        case 9745: return "plasma";
        case 43114: return "avax";
    }
    return null;
}