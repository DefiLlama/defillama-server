import { Write } from '../../utils/dbInterfaces';
import { getApi } from '../../utils/sdk';
import { addToDBWritesList } from '../../utils/database';

interface CoinConfig {
    [symbol: string]: string;
}

interface ChainConfig {
    [chain: string]: CoinConfig;
}

interface ChainOracle {
    [chain: string]: string;
}

const config: ChainConfig = {
    bsc: {
        GFST: '0xbA2e788D83eA786d11ED87353763616157A35082',
        STBX: '0x65DaD60a28626309F7504d853AFF0099FeD1aAaF',
        SLX: '0x2C4A911B16435f96e6bD18E4d720a32480554a22',
        LSRWA: '0x475eD67Bfc62B41c048b81310337c1D75D45aADd',
    },
    polygon: {
        CSB23: '0x76381bFCCB35736a854675570c07a73508622AFd',
        MFRET: '0xAa6d73C22A953a6A83B9963052bA73f0C53FC764',
        MRDTS: '0xF71272DBC0Da11aDd09cd44A0b7F7D384C0D5Fe1',
        CTREAL: '0x06c3aa74645f424d24f6C835e8D606D35225Ab96',
    },
};

const oracles: ChainOracle = {
    bsc: '0x4e9651AD369d8F986935852C945338F76b5fb360',
    polygon: '0x4e9651AD369d8F986935852C945338F76b5fb360',
};

export default async function getTokenPrices(
    timestamp: number = 0
): Promise<Write[]> {
    const writes: Write[] = [];

    for (const chain in config) {
        for (const [symbol, value] of Object.entries(config[chain])) {
            const chainApi = await getApi(chain, timestamp);
            const tokenInfo = await chainApi.call({
                abi: 'function getCoinPrice(uint256, address, address)external view returns (bool, uint256)',
                target: oracles[chain],
                params: [
                    840,
                    value,
                    '0x0000000000000000000000000000000000000000',
                ],
            });
            const tokenPrice = tokenInfo[1] / 1e18;

            addToDBWritesList(
                writes,
                chain,
                value,
                tokenPrice,
                0,
                symbol,
                timestamp,
                'stobox',
                1
            );
        }
    }

    return writes;
}
