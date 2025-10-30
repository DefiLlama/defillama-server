import { call } from "@defillama/sdk/build/abi/index";
import { Write, } from "../../utils/dbInterfaces";
import { addToDBWritesList, } from "../../utils/database";
import tokens from "./tokens.json";

export default async function getTokenPrice(timestamp: number) {
    const writes: Write[] = [];
    return contractCalls(writes, timestamp);
}


async function contractCalls(
    writes: Write[],
    timestamp: number,
  ) {
    await Promise.all(tokens.chains.map(async (item) => {
        const amlpPrice = await call({
            target: item.amlp.stakingContract,
            chain: item.chain,
            abi: "function price() external view override returns (uint256)"
        })
        const mPrice = amlpPrice.output / 10 ** 18

        addToDBWritesList(writes, item.chain, item.amlp.token, mPrice, 18, item.amlp.symbol, timestamp, 'amlp', item.amlp.rate)
        
        const ahlpPrice = await call({
            target: item.ahlp.stakingContract,
            chain: item.chain,
            abi: "function price() external view override returns (uint256)"
        })
        const hPrice = ahlpPrice.output / 10 ** 18
        addToDBWritesList(writes, item.chain, item.ahlp.token, hPrice, 18, item.ahlp.symbol, timestamp, 'ahlp', item.ahlp.rate)
    }))
    return writes
}
