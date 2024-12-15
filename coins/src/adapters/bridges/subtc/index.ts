import { Token } from "../index";
import { formatExtraTokens } from "../../utils";

const chain = 'core'
export default async function bridge(): Promise<Token[]> {
    const tokens: Token[] = [
        {
            from: `${chain}:0xe85411c030fb32a9d8b14bbbc6cb19417391f711`,
            to: `coingecko#bitcoin`,
            symbol: "suBTC",
            decimals: 18
        }
    ];

    const response = [tokens, extraTokens];
    return response.flat();
}

const extraTokens = formatExtraTokens(chain, []);