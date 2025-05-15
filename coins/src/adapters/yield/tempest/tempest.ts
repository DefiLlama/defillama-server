import {
    addToDBWritesList,
    getTokenAndRedirectDataMap,
} from "../../utils/database";
import { CoinData, Write } from "../../utils/dbInterfaces";
import { getCurrentUnixTimestamp } from "../../../utils/date";
import { getApi } from "../../utils/sdk";
import axios from "axios";

const sdk = require("@defillama/sdk");
const rswethAbi = require("./rsweth.abi.json");
const symmetricAbi = require("./symmetric.abi.json");

interface Market {
    vaultAddress: string;
    vaultDecimals: string;
    vaultSymbol: string;
    token0Address: string;
    token1Address: string;
    token0Decimals: number;
    token1Decimals: number;
    strategy: string;
    totalSupply: number;
    token0Amount: number;
    token1Amount: number;
}

async function fetchFromTempestApi(chainId: number): Promise<Market[]> {
    const url = `https://protocol-service-api.tempestfinance.xyz/api/v1/vaults?chainId=${chainId}`;

    const response = await axios.get(url);

    return response.data.data.vaults.map((m: any) => ({
        vaultAddress: m.address,
        vaultDecimals: m.vaultDecimals,
        vaultSymbol: m.vaultSymbol,
        token0Address: m.token0Address,
        token1Address: m.token1Address,
        token0Decimals: m.token0Decimals,
        token1Decimals: m.token1Decimals,
        strategy: m.strategy,
        totalSupply: 0,
        token0Amount: 0,
        token1Amount: 0,
    }));
}

async function getTempestTokens(
    chain: string,
    timestamp: number
): Promise<Market[]> {
    // const currentBlock = await getBlock(chain, timestamp);
    let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
    const api = await getApi(chain, t, true);
    const chainId = api.chainId ?? 1;

    const vaults = await fetchFromTempestApi(chainId);

    const rswEthVaults = vaults.filter((m: any) => m.strategy === "rswEth");
    const symmetricVaults = vaults.filter(
        (m: any) => m.strategy === "symetricAmbient"
    );

    const [
        rswethPositions,
        symmetricPositions,
        rswethSupplies,
        symmetricSupplies,
    ] = await Promise.all([
        sdk.api.abi.multiCall({
            calls: rswEthVaults.map((vault: Market) => ({
                target: vault.vaultAddress,
                params: [],
            })),
            abi: rswethAbi.find((m: any) => m.name === "getPositions"),
            chain,
            permitFailure: true,
        }),
        sdk.api.abi.multiCall({
            calls: symmetricVaults.map((vault: Market) => ({
                target: vault.vaultAddress,
                params: [],
            })),
            abi: symmetricAbi.find((m: any) => m.name === "getPositions"),
            chain,
            permitFailure: true,
        }),

        sdk.api.abi.multiCall({
            calls: rswEthVaults.map((vault: Market) => ({
                target: vault.vaultAddress,
                params: [],
            })),
            abi: rswethAbi.find((m: any) => m.name === "totalSupply"),
            chain,
            permitFailure: true,
        }),
        sdk.api.abi.multiCall({
            calls: symmetricVaults.map((vault: Market) => ({
                target: vault.vaultAddress,
                params: [],
            })),
            abi: symmetricAbi.find((m: any) => m.name === "totalSupply"),
            chain,
            permitFailure: true,
        }),
    ]);

    const rswethMarketData = rswethPositions.output.map(
        (position: any, i: number) => {
            const token0Sum =
                BigInt(position.output[0]) + // amount0Invested
                BigInt(position.output[2]) + // amount0Idle
                BigInt(position.output[4]) + // amountInQueue
                BigInt(position.output[5]); // amountUnwrappedToken
            const token1Sum =
                BigInt(position.output[1]) + // amount1Invested
                BigInt(position.output[3]); // amount1Idle

            const token0Divisor =
                BigInt(10) ** BigInt(rswEthVaults[i].token0Decimals);
            const token1Divisor =
                BigInt(10) ** BigInt(rswEthVaults[i].token1Decimals);
            const supplyDivisor =
                BigInt(10) ** BigInt(rswEthVaults[i].vaultDecimals);

            const token0Amount = Number(token0Sum) / Number(token0Divisor);
            const token1Amount = Number(token1Sum) / Number(token1Divisor);
            const totalSupply =
                Number(rswethSupplies.output[i].output) / Number(supplyDivisor);

            return {
                vaultAddress: rswEthVaults[i].vaultAddress,
                vaultDecimals: rswEthVaults[i].vaultDecimals,
                vaultSymbol: rswEthVaults[i].vaultSymbol,
                token0Address: rswEthVaults[i].token0Address,
                token1Address: rswEthVaults[i].token1Address,
                token0Decimals: rswEthVaults[i].token0Decimals,
                token1Decimals: rswEthVaults[i].token1Decimals,
                strategy: rswEthVaults[i].strategy,
                totalSupply: totalSupply,
                token0Amount: token0Amount,
                token1Amount: token1Amount,
            };
        }
    );

    const symmetricMarketData = symmetricPositions.output.map(
        (position: any, i: number) => {
            const token0Sum =
                BigInt(position.output[0]) + // amount0Invested
                BigInt(position.output[2]); // amount0Idle
            const token1Sum =
                BigInt(position.output[1]) + // amount1Invested
                BigInt(position.output[3]); // amount1Idle

            const token0Divisor =
                BigInt(10) ** BigInt(symmetricVaults[i].token0Decimals);
            const token1Divisor =
                BigInt(10) ** BigInt(symmetricVaults[i].token1Decimals);
            const supplyDivisor =
                BigInt(10) ** BigInt(symmetricVaults[i].vaultDecimals);

            const token0Amount = Number(token0Sum) / Number(token0Divisor);
            const token1Amount = Number(token1Sum) / Number(token1Divisor);
            const totalSupply =
                Number(symmetricSupplies.output[i].output) / Number(supplyDivisor);

            return {
                vaultAddress: symmetricVaults[i].vaultAddress,
                vaultDecimals: symmetricVaults[i].vaultDecimals,
                vaultSymbol: symmetricVaults[i].vaultSymbol,
                token0Address: symmetricVaults[i].token0Address,
                token1Address: symmetricVaults[i].token1Address,
                token0Decimals: symmetricVaults[i].token0Decimals,
                token1Decimals: symmetricVaults[i].token1Decimals,
                strategy: symmetricVaults[i].strategy,
                totalSupply: totalSupply,
                token0Amount: token0Amount,
                token1Amount: token1Amount,
            };
        }
    );
    const marketData = [...rswethMarketData, ...symmetricMarketData];
    return marketData;
}

function formWrites(
    markets: Market[],
    tokenPrices: { [key: string]: CoinData },
    chain: string,
    timestamp: number
) {
    const writes: Write[] = [];
    markets.map((m: any) => {
        const token0CoinData: CoinData | undefined =
            tokenPrices[m.token0Address.toLowerCase()];
        const token1CoinData: CoinData | undefined =
            tokenPrices[m.token1Address.toLowerCase()];
        if (token0CoinData == null || token1CoinData == null) return;
        const tempestTokenPrice: number =
            (m.token0Amount * token0CoinData.price +
                m.token1Amount * token1CoinData.price) /
            m.totalSupply;

        if (tempestTokenPrice == 0) return;

        addToDBWritesList(
            writes,
            chain,
            m.vaultAddress,
            tempestTokenPrice,
            m.vaultDecimals,
            `${m.symbol}`,
            timestamp,
            "tempest",
            0.9
        );
    });

    console.log("writes", writes);
    return writes;
}

export default async function getTempestTokenPrices(
    chain: string,
    timestamp: number
) {
    const TempestTokens = await getTempestTokens(chain, timestamp);

    const token0Addresses = TempestTokens.map((m: Market) => m.token0Address);
    const token1Addresses = TempestTokens.map((m: Market) => m.token1Address);
    const tokenAddresses = [
        ...new Set([...token0Addresses, ...token1Addresses]),
    ];
    const tokenPrices = await getTokenAndRedirectDataMap(
        tokenAddresses,
        chain,
        timestamp
    );

    return formWrites(TempestTokens, tokenPrices, chain, timestamp);
}
