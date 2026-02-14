import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import getWrites from "../../utils/getWrites";

// Ultraround Money / Rage vaults on Base
// These are WeightedIndex contracts that implement convertToAssets() and getAllAssets()
// but do NOT implement the standard ERC-4626 asset() method.
const config: { [chain: string]: { [name: string]: string } } = {
    base: {
        pHestia: "0xF760fD8fEB1F5E3bf3651E2E4f227285a82470Ff",
        pCircle: "0x55A81dA2a319dD60fB028c53Cb4419493B56f6c0",
    },
};

export async function rage(timestamp: number = 0) {
    return Promise.all(
        Object.keys(config).map((chain) => getTokenPrices(chain, timestamp)),
    );
}

async function getTokenPrices(
    chain: string,
    timestamp: number,
): Promise<Write[]> {
    const api = await getApi(chain, timestamp);
    const tokens = Object.values(config[chain]);

    const allAssets: string[][] = await api.multiCall({
        abi: "function getAllAssets() view returns (address[])",
        calls: tokens,
    });
    const underlyingTokens = allAssets.map((a) => a[0]);

    const decimals: number[] = await api.multiCall({
        abi: "uint8:decimals",
        calls: tokens,
    });

    const prices: bigint[] = await api.multiCall({
        abi: "function convertToAssets(uint256) view returns (uint256)",
        calls: tokens.map((t, i) => ({
            target: t,
            params: [BigInt(10 ** decimals[i]).toString()],
        })),
    });

    const pricesObject: any = {};
    tokens.forEach((token, i) => {
        // skip contracts that don't have exactly one asset
        if (allAssets[i].length !== 1) return;
        pricesObject[token] = {
            underlying: underlyingTokens[i],
            price: Number(prices[i]) / 10 ** decimals[i],
        };
    });
    return getWrites({
        chain,
        timestamp,
        pricesObject,
        projectName: "rage",
    });
}
