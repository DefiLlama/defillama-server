import { Write } from "../utils/dbInterfaces";
import { getTokenAndRedirectData } from "../utils/database";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";

const assets: { [chain: string]: string[] } = {
    'ethereum': ["0x23238f20b894f29041f48D88eE91131C395Aaa71"]
}

const M: { [chain: string]: string } = {
    'ethereum': "0x866A2BF4E572CbcF37D5071A7a58503Bfb36be1b"
}

export async function m0(timestamp: number = 0): Promise<Write[][]> {
    const m0Data = await getTokenAndRedirectData([M['ethereum']], 'ethereum', timestamp);
    if (!m0Data.length) return [];
    const [{ price: m0Price }] = m0Data;
    return Promise.all(Object.keys(assets).map(async (chain: string) => {
        const writes: Write[] = [];
        const api = await getApi(chain, timestamp);

        const [balances, totalAssets, symbols, decimals, totalSupplies] = await Promise.all([
            api.multiCall({ abi: 'erc20:balanceOf', calls: assets[chain].map((params) => ({ target: M[chain], params })) }),
            api.multiCall({ abi: 'uint256:totalAssets', calls: assets[chain] }),
            api.multiCall({ abi: 'erc20:symbol', calls: assets[chain] }),
            api.multiCall({ abi: 'erc20:decimals', calls: assets[chain] }),
            api.multiCall({ abi: 'erc20:totalSupply', calls: assets[chain] }),
        ])

        assets[chain].forEach((address, i) => {
            const price = (Number(balances[i]) + Number(totalAssets[i])) * m0Price / (Number(totalSupplies[i]) * 10 ** (6 - decimals[i]))
            addToDBWritesList(writes, chain, address, price, decimals[i], symbols[i], timestamp, 'M0', 1);
        });

        return writes;
    }));
}