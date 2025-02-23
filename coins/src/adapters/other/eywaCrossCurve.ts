import axios from 'axios';
import { getApi } from "../utils/sdk";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";


const tokenAddresses = {
    'sCRV_e': '0xf47Be881f4a0a3557819fc917ec722b4dad627bb',
    'sCRV_ar': '0x1329C1ca6819B6A0550151Ee802E62C704Cee589',
    'sCRV_ba': '0xae3afe90fdda54c1bb7a0c4cd40c6d46c3b471cc',
    'sCRV_o': '0xa28693eea6145709b60dfafa1b2c14456ff0b083',
    'sCRV_p': '0x0d773d1ba78dfe11739393d6526ad3c48bb7dd3c',
    'sCRV_g': '0x313e51513cb252ba39c37a70a69c64efc404ee8b',
    'sCRV_fr': '0xa4e6e9b68fd4f32a22cb890b411cf68206479928',
    'sCRV_ft': '0xcc62792dc59ad5d3d287fe5b5304fe01147e9527'
};

async function getEywaTokenPrice(address: string, chainId: number): Promise<number> {
    const response = await axios.get(`https://api.crosscurve.fi/prices/${address}/${chainId}`);
    return Number(response.data);
}

export default async function eywaAdapter(timestamp: number = 0, writes: Write[] = []) {
    const chain = 'sonic';
    const chainId = 146;

    const api = await getApi(chain, timestamp);

    const firstTokenAddress = Object.values(tokenAddresses)[0];
    const firstTokenPrice = await getEywaTokenPrice(firstTokenAddress, chainId);

    for (const [symbol, address] of Object.entries(tokenAddresses)) {
        try {
            let price: number;

            if (address === firstTokenAddress) {
                price = firstTokenPrice;
            } else {
                const oraclePrice = await api.call({
                    target: '0x38dd6b3c096c8cbe649fa0039cc144f333be8e61',
                    abi: 'function price_oracle(uint256 i) view returns (uint256)',
                    params: [Object.keys(tokenAddresses).indexOf(symbol)]
                });
                price = (oraclePrice / 1e18) * firstTokenPrice;
            }


            addToDBWritesList(
                writes,
                chain,
                address,
                price,
                18,
                symbol,
                timestamp,
                'eywa',
                0.9
            );
        } catch (error) {
            console.error(`Error fetching price for ${symbol} (${address}):`, error);
        }
    }

    return writes;
}