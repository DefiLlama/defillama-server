import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { getBtcToUsdPrice } from "./utils";

const oBTCConfig = {
    address: "0x1Ee774B40eECef1ed4BB702C83A97dc949c900e5",
    decimals: 8,
    symbol: "oBTC",
}


export async function oBTC(timestamp: number) {
    const writes: Write[] = [];

    const price = await getBtcToUsdPrice(timestamp);

    addToDBWritesList(
        writes,
        "ethereum",
        oBTCConfig.address,
        price,
        oBTCConfig.decimals,
        oBTCConfig.symbol,
        timestamp,
        "optimex",
        0.98,
    );

    return writes;
}

export const adapters = {
    oBTC,
}