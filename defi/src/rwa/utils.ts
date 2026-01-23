import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";

// convert spreadsheet titles to API format
export function toCamelCase(str: string): string {
    return str
        .toLowerCase()
        .replace(/\//g, " ")
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, "");
}

// Sort tokens by chain and map token to project for fetching supplies, tvls etc
export function sortTokensByChain(tokens: { [protocol: string]: string[] }): { tokensSortedByChain: { [chain: string]: string[] }, tokenToProjectMap: { [token: string]: string } } {
    const tokensSortedByChain: { [chain: string]: string[] } = {};
    const tokenToProjectMap: { [token: string]: string } = {};

    Object.keys(tokens).map((protocol: string) => {
        tokens[protocol].map((pk: any) => {
            if (pk == false || pk == null) return;
            const chain: string = pk.substring(0, pk.indexOf(":"));

            if (!tokensSortedByChain[chain]) tokensSortedByChain[chain] = [];
            const normalizedPk: string = chainsThatShouldNotBeLowerCased.includes(chain) ? pk : pk.toLowerCase();

            tokensSortedByChain[chain].push(normalizedPk);
            tokenToProjectMap[normalizedPk] = protocol;
        });
    });

    return { tokensSortedByChain, tokenToProjectMap };
}

export const fetchBurnAddresses = (chain: string): string[] => chain == 'solana' ? ['1nc1nerator11111111111111111111111111111111']
    : ['0x0000000000000000000000000000000000000000', '0x000000000000000000000000000000000000dead'];
