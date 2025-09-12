import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";
const abi = 'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'

export async function circle(timestamp: number): Promise<Write[]> {
    const symbol = 'USYC'
    const api = await getApi("ethereum", timestamp);
    const tokenPrice = (await api.call({ abi, target: "0x4c48bcb2160F8e0aDbf9D4F3B034f1e36d1f8b3e", })).answer / 1e8;

    const writes: Write[] = [];
    addToDBWritesList(writes, 'ethereum', '0x136471a34f6ef19fe571effc1ca711fdb8e49f2b', tokenPrice, 6, symbol, timestamp, "circle-rwa", 0.8,);
    addToDBWritesList(writes, 'bsc', '0x8D0fA28f221eB5735BC71d3a0Da67EE5bC821311', tokenPrice, 6, symbol, timestamp, "circle-rwa", 0.8,);

    return writes;
}
