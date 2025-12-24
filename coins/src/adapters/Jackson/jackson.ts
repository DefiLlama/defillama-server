import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'

const chain = 'sui'

const symbol = 'JACKSON'
const address = '0x5ffe80c90a653e3ca056fd3926987bf3e8068ca21528bb4fdbc4d487cc152dad::jackson::JACKSON'

export default async function getTokenPrices(timestamp: number) {
    const writes: Write[] = [];

    const price_url = 'https://api-sui.cetus.zone/v3/sui/market_price?base_symbol_address=' + address
    const { data: { data: { prices } } } = await axios.get(price_url)
    const price = prices[0].price

    addToDBWritesList(writes, chain, address, price, 8, symbol, timestamp, 'jackson', 0.9)

    return writes
}
