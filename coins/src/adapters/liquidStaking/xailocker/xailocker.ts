import getBlock from "../../utils/block";
import {Write} from "../../utils/dbInterfaces";
import {getCurrentUnixTimestamp} from "../../../utils/date";
import {getTokenAndRedirectData} from "../../utils/database";
import {call} from "@defillama/sdk/build/abi";
import abi from "./abi.json";
import {formatUnits} from "ethers";

// Other meta
const XAI_ADDRESS = '0x4cb9a7ae498cedcbb5eae9f25736ae7d428c9d66';
const AL_XAI_TO_XAI_CURVE_POOL = '0x8f26c8041a963c5b0846c68f02d68c8cdfd7afdc';
const XAI_SERVICE_ADDRESS = '0x3f64914f2c8ce32256adbf609f139b9e3d6a291a';
const CHAIN: any = "arbitrum";

// One of first blocks where CURVE pool got enough liquidity for trades
const CURVE_POOL_EXCHANGE_AVAILABILITY_ARB_BLOCK_FROM = 261941132;

// Locker meta
const COMON_META = {
    decimals: 18,
    confidence: 0.9,
    adapter: "xailocker",
}
const ST_XAI_ADDRESS = '0xab5c23bdbe99d75a7ae4756e7ccefd0a97b37e78';
const ST_XAI_META = {
    PK: `asset#${CHAIN}:${ST_XAI_ADDRESS}`,
    symbol: "stXAI",
    ...COMON_META
}
const AL_XAI_ADDRESS = '0x4ac623237de0aa622b4fdf4da63cf97216371acf';
const AL_XAI_META = {
    PK: `asset#${CHAIN}:${AL_XAI_ADDRESS}`,
    symbol: "alXAI",
    ...COMON_META
}

export default async function getTokenPrice(timestamp: number): Promise<Write[]> {
    if (timestamp === 0) {
        return fetchPrices();
    }

    const block = await getBlock(CHAIN, timestamp);
    if (!block) {
        return []
    }
    if (block < CURVE_POOL_EXCHANGE_AVAILABILITY_ARB_BLOCK_FROM) {
        return []
    }

    return fetchPrices({
        block,
        timestamp
    });
}

async function fetchPrices(params?: {
    timestamp: number,
    block: number
}): Promise<Write[]> {
    const xaiPricePromise =  getTokenAndRedirectData(
        [XAI_ADDRESS],
        CHAIN,
        params?.timestamp ?? getCurrentUnixTimestamp()
    );
    // alXAI - 0, XAI - 1
    const curvePoolRate: Promise<{ output: string }> = call({
        target: AL_XAI_TO_XAI_CURVE_POOL,
        abi: abi.curvePoolQuoteAlXaiToXai,
        chain: CHAIN,
        params: ['0', '1', String(1e18)],
        block: params?.block
    });
    const rateStXaiToAlXaiPromise: Promise<{ output: string }> = call({
        target: XAI_SERVICE_ADDRESS,
        abi: abi.previewSharesToLiquidity,
        chain: CHAIN,
        params: [String(1e18)],
        block: params?.block
    });
    const [xaiPriceRes, rateResult, curvePoolRateRes] = await Promise.all(
        [
            xaiPricePromise,
            rateStXaiToAlXaiPromise,
            curvePoolRate
        ]).catch(() => {
        throw new Error('Could not fetch pool supply or ratio')
    });

    const usdXaiPrice = xaiPriceRes[0].price;
    const multiplierXaiToAlXai = parseFloat(formatUnits(curvePoolRateRes.output, 18));

    const usdAlXaiPrice = usdXaiPrice * multiplierXaiToAlXai;
    const multiplierAlXaiToStXai = parseFloat(formatUnits(rateResult.output, 18));

    const usdStXaiPrice = usdAlXaiPrice * multiplierAlXaiToStXai;

    const stXaiWrites = [{
        SK: 0,
        ...ST_XAI_META,
        timestamp: getCurrentUnixTimestamp(),
        price: usdStXaiPrice
    },
    {
        SK: getCurrentUnixTimestamp(),
        ...ST_XAI_META,
        price: usdStXaiPrice
    }];

    const alXaiWrites = [{
        SK: 0,
        ...AL_XAI_META,
        price: usdAlXaiPrice,
        timestamp: getCurrentUnixTimestamp(),
    },
    {
        SK: getCurrentUnixTimestamp(),
        ...AL_XAI_META,
        price: usdAlXaiPrice
    }];

    return [...stXaiWrites, ...alXaiWrites];
}