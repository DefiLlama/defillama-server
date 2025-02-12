import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";

const config: { [chain: string]: { [symbol: string]: string } } = {
    hashkey: {
        PacARB: "0x7f69a2ba074dA1Fd422D994ee05C4B8CA83A32C7",
    }
};

export async function thePAC(timestamp: number): Promise<Write[]> {
    const api = await getApi("hashkey", timestamp);
    const tokenPrices: { [address: string]: number } = {
        PacARB:
            (await api.call({
                abi: "uint256:getLatestPrice",
                target: "0x93440F790f7E7ce2A74eF7051E8D4a0d7f05DF09",
            })) / 1e18,
    };

    const writes: Write[] = [];

    Object.keys(config).map((chain: string) =>
        Object.keys(config[chain]).map((symbol: string) => {
            const price: number = tokenPrices[symbol];
            const address: string = config[chain][symbol];
            addToDBWritesList(
                writes,
                chain,
                address,
                price,
                18,
                symbol,
                timestamp,
                "thepac-rwa",
                0.8,
            );
        }),
    );

    return writes;
}
