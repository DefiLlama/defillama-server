import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";

export async function hashnote(timestamp: number): Promise<Write[]> {
    const chain = "canto"
    const address = "0xfb8255f0de21acebf490f1df6f0bdd48cc1df03b"
    const symbol = 'USYC'
    const api = await getApi("canto", timestamp);
    const tokenPrice = (await api.call({
        abi: 'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
        target: "0x1d18c02bc80b1921255e71cf2939c03258d75470",
    })).answer / 1e8;

    const writes: Write[] = [];

    addToDBWritesList(
        writes,
        chain,
        address,
        tokenPrice,
        6,
        symbol,
        timestamp,
        "hashnote-rwa",
        0.8,
    );

    return writes;
}
