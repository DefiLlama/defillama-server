import { Protocol } from "../protocols/data";
import { TokensValueLocked, tvlsObject } from "../types";
import { getCurrentUnixTimestamp } from "../utils/date";
import { getLastRecord, hourlyUsdTokensTvl } from "../utils/getLastRecord";
import { executeAndIgnoreErrors } from "./errorDb";

export default async (
    protocol: Protocol,
    tvl: tvlsObject<TokensValueLocked>,
) => {
    if (Object.keys(tvl).length === 0) {
        return;
    }

    const lastRecord = await getLastRecord(hourlyUsdTokensTvl(protocol.id))
    if (lastRecord === undefined) {
        return
    }

    Object.keys(lastRecord).map(chain => {
        const currentChainTokens = tvl[chain]
        if (currentChainTokens === undefined) {
            return
        }
        Object.keys(lastRecord[chain]).map(token => {
            if (currentChainTokens[token] === undefined) {
                if (process.env.LOCAL === 'true') return;

                executeAndIgnoreErrors('INSERT INTO `droppedCoins` VALUES (?, ?, ?, ?, ?)', [
                    getCurrentUnixTimestamp(),
                    protocol.name,
                    lastRecord[chain][token], // tvl
                    chain,
                    token
                ])
            }
        })
    })
}