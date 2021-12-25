import { fetch, formatExtraTokens } from "../utils"
/*
export default async function bridge() {
    const tokenlist = await fetch(
            "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json"
        ).then(r=>r.json())
        .then(r => r.data.tokens);
    const tokenBalances = await Promise.all(
        tokensAndAccounts.map((t) => getTokenBalance(...t))
    );
    const balances = {};
    for (let i = 0; i < tokensAndAccounts.length; i++) {
        const token = tokensAndAccounts[i][0];
        let coingeckoId = tokenlist.find((t) => t.address === token)?.extensions
            ?.coingeckoId;
        const replacementCoingeckoId = tokensAndAccounts[i][2];
        if (coingeckoId === undefined) {
            if (replacementCoingeckoId !== undefined) {
                coingeckoId = replacementCoingeckoId;
            } else {
                throw new Error(`Solana token ${token} has no coingecko id`);
            }
        }
        balances[coingeckoId] = (balances[coingeckoId] || 0) + tokenBalances[i];
    }
    return balances;
}
*/