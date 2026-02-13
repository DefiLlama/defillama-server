import * as sdk from '@defillama/sdk'
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
const { call, } = sdk.api.abi;
import { calculate4626Prices } from "../utils/erc4626";
import getBlock from "../utils/block";

const cUSD: string = "0xcccc62962d17b8914c62d74ffb843d73b2a3cccc";
const stcUSD: string = "0x88887bE419578051FF9F4eb6C858A951921D8888";
const pythcUSDReserveOracle: string = "0x9A5a3c3Ed0361505cC1D4e824B3854De5724434A";
const chain: any = "ethereum";

export default async function getTokenPrices(timestamp: number) {
    const writes: Write[] = [];
    let block: number | undefined = await getBlock(chain, timestamp);

    const [cUSDPriceRes] = await Promise.all([
        call({
            target: pythcUSDReserveOracle,
            params: [],
            chain,
            abi: 'uint256:latestAnswer',
            block
        }),
    ]);

    addToDBWritesList(
        writes,
        chain,
        cUSD,
        cUSDPriceRes.output,
        8,
        "cUSD",
        timestamp,
        "cap",
        0.9
    );

    const stcUSDPrices = await calculate4626Prices(chain, timestamp, [stcUSD], "cap");
    writes.push(...stcUSDPrices);

    return writes;
}
