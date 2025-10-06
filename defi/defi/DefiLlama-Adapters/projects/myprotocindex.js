const { fetchURL } = require('../../helper/utils')

async function tvl() {
  const data = await fetchURL('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
  return {
    ethereum: data.ethereum.usd
  }
}

module.exports = {
  misrepresentedTokens: false,
  methodology: "Example adapter returning ETH price in USD to show backend data fetching.",
  tvl
}
