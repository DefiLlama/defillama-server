import {
    addToDBWritesList,
    getTokenAndRedirectDataMap,
} from "../../utils/database";
import { CoinData, Write } from "../../utils/dbInterfaces";
import { getCurrentUnixTimestamp } from "../../../utils/date";
import getBlock from "../../utils/block";
import { getApi } from "../../utils/sdk";

const sdk = require("@defillama/sdk");
const vaultAbi = require("./vault.abi.json");

interface Market {
    address: string;
    symbol: string;
    // decimals: number;
    underlying: string;
    sharePrice: number;
}

async function getEulerV2Tokens(
    chain: string,
    timestamp: number,
    factory: string,
    fromBlock: number
): Promise<Market[]> {
    // const currentBlock = await getBlock(chain, timestamp);
    let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
    const api = await getApi(chain, t, true);
    const currentBlock = Number(api.block);

    // Fetch all pools from factory events
    const vaultDeploys = await api.getLogs({
        target: factory,
        fromBlock: fromBlock,
        toBlock: currentBlock,
        topics: [
            "0x04e664079117e113faa9684bc14aecb41651cbf098b14eda271248c6d0cda57c",
        ],
        eventAbi:
            "event ProxyCreated(address indexed proxy, bool upgradeable, address implementation, bytes trailingData)",
    });

    const vaultAddresses = vaultDeploys.map((vaultDeploy: any) => {
        return vaultDeploy.args[0]; // proxy
    });

    const [assets, sharePrice, symbols] = await Promise.all([
        sdk.api.abi.multiCall({
            calls: vaultAddresses.map((address: any) => ({
                target: address,
                params: [],
            })),
            abi: vaultAbi.find((m: any) => m.name === "asset"),
            chain,
            permitFailure: true,
        }),
        sdk.api.abi.multiCall({
            calls: vaultAddresses.map((address: any) => ({
                target: address,
                params: [sdk.util.convertToBigInt(1e18).toString()],
            })),
            abi: vaultAbi.find((m: any) => m.name === "convertToAssets"),
            chain,
            permitFailure: true,
        }),
        sdk.api.abi.multiCall({
            calls: vaultAddresses.map((address: any) => ({
                target: address,
                params: [],
            })),
            abi: vaultAbi.find((m: any) => m.name === "symbol"),
            chain,
            permitFailure: true,
        }),
    ]);

    const marketData = assets.output.map((asset: any, i: number) => {
        return {
            address: vaultAddresses[i],
            underlying: asset["output"],
            symbol: symbols.output[i].output,
            sharePrice: sharePrice.output[i].output / 1e18,
        };
    });

    return marketData;
}

function formWrites(
    markets: Market[],
    underlyingPrices: { [key: string]: CoinData },
    chain: string,
    timestamp: number
) {
    const writes: Write[] = [];
    markets.map((m: any) => {
        const coinData: CoinData | undefined =
            underlyingPrices[m.underlying.toLowerCase()];
        const rate = m.sharePrice;
        if (coinData == null || rate == null) return;
        const eTokenPrice: number = coinData.price * rate;

        if (eTokenPrice == 0) return;

        addToDBWritesList(
            writes,
            chain,
            m.address,
            eTokenPrice,
            coinData.decimals,
            `${m.symbol}`,
            timestamp,
            "euler",
            0.9
        );
    });

    return writes;
}

export default async function getEulerV2TokenPrices(
    chain: string,
    timestamp: number,
    factory: string,
    fromBlock: number
) {
    const eulerV2Tokens = await getEulerV2Tokens(
        chain,
        timestamp,
        factory,
        fromBlock
    );

    const underlyingPrices = await getTokenAndRedirectDataMap(
        eulerV2Tokens.map((m: Market) => m.underlying),
        chain,
        timestamp
    );

    return formWrites(eulerV2Tokens, underlyingPrices, chain, timestamp);
}
