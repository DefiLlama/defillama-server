import fetch from "node-fetch"

export const chainToId = {
    ethereum: 'ethereum',
    polygon: 'polygon',
    arbitrum: 'arbitrum'
} as any

export const name = 'Odos'

export async function getQuote(chain: string, from: string, to: string, amount: string) {
	const data = await fetch('https://app.odos.xyz/request-path', {
		method: 'POST',
		body: JSON.stringify({
			fromValues: [Number(amount) / 1e18], // fix
			fromTokens: [from], // gas token 0x0000000000000000000000000000000000000000
			toTokens: [to],
			gasPrice: 159.4, // fix
			lpBlacklist: [],
			chain: chainToId[chain],
			slippageAmount: 1,
			walletAddress: null
		}),
		headers: {
			'Content-Type': 'application/json'
		}
	}).then((r) => r.json())
	return {
		amountReturned: data.netOutValue,
		estimatedGas: data.gasEstimate,
		tokenApprovalAddress: data.inputDests[0],
		rawQuote: data
	}
}