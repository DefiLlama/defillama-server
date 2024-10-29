import { Write, } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import { addToDBWritesList, getTokenAndRedirectDataMap } from "../../utils/database";

export const config = {
    arbitrum: {
        lps: [
            '0x80c89197ba29c0ad921ad0f7c2e1403579d36c65',
        ],
        tokens:[
            '0xcEab5Af10D5376016c8C352ea77F8Bc6a88bDa11',
        ]

    },
} as any
const nullAddress: string = "0x0000000000000000000000000000000000000000";
export default async function getTokenPrices(chain: string, timestamp: number) {
    const api = await getApi(chain, timestamp)

    const { lps } = config[chain]
    const { tokens } = config[chain]
    const writes: Write[] = [];
    await _getWrites()

    return writes

    async function _getWrites() {
        if (!lps.length) return;
        const [
              decimals, symbols, uBalances
        ] = await Promise.all([
            api.multiCall({ abi: 'erc20:decimals', calls: tokens }),
            api.multiCall({ abi: "string:symbol", calls: tokens }),
            api.multiCall({ abi: 'function querySellBase(address trader, uint256 payBaseAmount) public view returns (uint256 receiveQuoteAmount, uint256 mtFee)',  calls: lps.map((address: string )=>({params:[nullAddress,1000000],target: address}))  }),
        ])
        const coinData = await getTokenAndRedirectDataMap([...tokens], chain, timestamp)

        uBalances.forEach(({ quoteAmount }: any, i: number) => {
            const tData = coinData[tokens[i].toLowerCase()]

            if (!tData ) return;

            const price = quoteAmount / (10 ** decimals[i])
            const confidence = 0.8
            addToDBWritesList(writes, chain, tokens[i], price, decimals[i], symbols[i], timestamp, 'worldes', confidence)
        })
    }
}
