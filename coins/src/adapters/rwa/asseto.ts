import {Write} from "../utils/dbInterfaces";
import {addToDBWritesList} from "../utils/database";
import {getApi} from "../utils/sdk";

const CHAIN = "hsk";

const TOKENS: any[] = [
    {
        name: "AoABT",
        tokenAddress: "0x80C080acd48ED66a35Ae8A24BC1198672215A9bD",
        pricerAddress: "0xD72529F8b54fcB59010F2141FC328aDa5Aa72abb"
    },

    {
        name: "AoABTa12m",
        tokenAddress: "0xf00A183Ae9DAA5ed969818E09fdd76a8e0B627E6",
        pricerAddress: "0x9BB1a9f99070341eADf705B8B973474EF2b9790F"
    },
    {
        name: "AoABTb",
        tokenAddress: "0x34B842D0AcF830134D44075DCbcE43Ba04286c12",
        pricerAddress: "0x8dB72b8F7F896569F6B254263D559902Ea2A9B35"
    },
]

export async function asseto(timestamp: number): Promise<Write[]> {
    const api = await getApi(CHAIN, timestamp, true);
    const writes: Write[] = [];

    const tokens = TOKENS.map((token) => token.tokenAddress);
    const pricers = TOKENS.map((token) => token.pricerAddress);

    const [decimals, symbols, prices] = await Promise.all([
        api.multiCall({ abi: "uint8:decimals", calls: tokens }),
        api.multiCall({ abi: "string:symbol", calls: tokens }),
        api.multiCall({ abi: "uint256:getLatestPrice", calls: pricers }),
    ]);

    TOKENS.forEach((token, i) => {
        addToDBWritesList(
            writes,
            CHAIN,
            token.tokenAddress,
            prices[i] / 10 ** decimals[i],
            decimals[i],
            symbols[i],
            timestamp,
            "asseto-rwa",
            0.8,
        );
    })
    return writes;
}
