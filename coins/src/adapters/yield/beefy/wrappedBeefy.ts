import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import { getLogs } from "../../../utils/cache/getLogs";
import { calculate4626Prices } from "../../utils/erc4626";
import { getTokenAndRedirectDataMap } from "../../utils/database";
import { log } from "@defillama/sdk";

const MIN_AUM_USD = 10_000;

// BeefyWrapperFactory contracts per chain
// These factories emit `ProxyCreated(address proxy)` when deploying ERC-4626 wrappers around vaults
const factories: { [chain: string]: { factory: string; fromBlock: number } } = {
    ethereum: { factory: "0x62fcbc7c3235950eD6dE4168fbd373aF9e8ee0fc", fromBlock: 18442677 },
    arbitrum: { factory: "0x48bF3a071098a09C7D00379b4DBC69Ab6Da83a36", fromBlock: 58844117 },
    avax: { factory: "0x1Fa046d28FF749b9D7CF7E9a41BEecd1260F11eD", fromBlock: 25957702 },
    base: { factory: "0x917447f8f52E7Db26cE7f52BE2F3fcb4d4D00832", fromBlock: 13245394 },
    bsc: { factory: "0x85B792C67cEe281064eb7A3AF0Fe2A76E9a7849e", fromBlock: 25465259 },
    fantom: { factory: "0x985CA8C1B4Ff5a15E1162BaE1669A928e5a6bD49", fromBlock: 55273391 },
    linea: { factory: "0xDBad28672fD60c4609EE6B26dF2b8cB93DE12afe", fromBlock: 4430127 },
    metis: { factory: "0xDf29382141059afD25Deb624E6c8f13A051012Be", fromBlock: 4695780 },
    optimism: { factory: "0x182be93E1C0C4d305fe43bD093292F21fd679797", fromBlock: 65960481 },
    polygon: { factory: "0x7e778f4cF8c7C43FB2F3C9C0b4Ce7CB7c2bad978", fromBlock: 38868800 },
};

export async function getWrappedBeefyPrices(chain: string, timestamp: number): Promise<Write[]> {
    const config = factories[chain];
    if (!config) return [];

    const api = await getApi(chain, timestamp);

    const logs = await getLogs({
        api,
        target: config.factory,
        fromBlock: config.fromBlock,
        eventAbi: "event ProxyCreated(address proxy)",
        onlyArgs: true,
    });

    const wrappers = logs.map((l: any) => l.proxy.toLowerCase());
    if (!wrappers.length) return [];

    // Filter by AUM >= $10k
    const assets = await api.multiCall({ abi: 'address:asset', calls: wrappers, permitFailure: true });
    const totalAssets = await api.multiCall({ abi: 'uint256:totalAssets', calls: wrappers, permitFailure: true });

    const validAssets = assets.filter((a: any) => a != null);
    const priceMap = await getTokenAndRedirectDataMap(validAssets, chain, timestamp);

    const filteredWrappers = wrappers.filter((_: string, i: number) => {
        const asset = assets[i];
        const total = totalAssets[i];
        if (!asset || !total) return false;

        const priceData = priceMap[asset.toLowerCase()];
        if (!priceData?.price) return false;

        const aum = (Number(total) / 10 ** priceData.decimals) * priceData.price;
        return aum >= MIN_AUM_USD;
    });

    log(`${wrappers.length} total Beefy wrappers filtered to ${filteredWrappers.length} wrappers with AUM >= $${MIN_AUM_USD.toLocaleString()} on ${chain}`);
    if (!filteredWrappers.length) return [];

    return calculate4626Prices(chain, timestamp, filteredWrappers, "beefy");
}

export const wrappedBeefyChains = Object.keys(factories);