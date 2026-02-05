import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import abi from "./abi.json";

const ROYCO_DAWN_SENIOR_VAULT_ADDRESSES: { [chain: string]: string } = {
    "ethereum": "0xcD9f5907F92818bC06c9Ad70217f089E190d2a32"
}

export default async function getDSVSharePrice(chain: string, timestamp: number): Promise<Write[]> {
    const vault = ROYCO_DAWN_SENIOR_VAULT_ADDRESSES[chain];
    const api = await getApi(chain, timestamp, true);

    const assetsPerShare = await api.call({
        abi: abi.convertToAssets,
        target: vault,
        params: 1e6,
    });

    const price = assetsPerShare / 1e6;

    const writes: Write[] = [];
    addToDBWritesList(
        writes,
        chain,
        vault,
        price,
        6,
        "srRoyUSDC",
        timestamp,
        "royco",
        0.95,
    );

    return writes;
}
