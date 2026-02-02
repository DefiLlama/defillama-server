import {
    addToDBWritesList,
    getTokenAndRedirectData,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const ctUsd = "0x8D82c4E3c936C7B5724A382a9c5a4E6Eb7aB6d5D";
const m = "0x866a2bf4e572cbcf37d5071a7a58503bfb36be1b";
const chain = "citrea";

export async function ctusd(timestamp: number) {
    const api = await getApi(chain, timestamp, true);

    const [bal, supply, mData] = await Promise.all([
        api.call({ abi: "erc20:balanceOf", target: m, params: [ctUsd] }),
        api.call({ abi: "erc20:totalSupply", target: ctUsd }),
        getTokenAndRedirectData([m], chain, timestamp),
    ]);

    const writes: Write[] = [];

    // ctUSD price = (M bal * M price) / ctUSD supply (both use 6 decimals)
    const price = (mData[0].price * Number(bal)) / Number(supply);

    addToDBWritesList(
        writes,
        chain,
        ctUsd,
        price,
        6,
        "ctUSD",
        timestamp,
        "ctusd",
        0.9,
    );

    return writes;
}