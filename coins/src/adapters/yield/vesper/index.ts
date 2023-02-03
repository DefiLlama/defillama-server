import getYieldWrites from "../../utils/yieldTokens";

const config = {
  ethereum: [
    '0xc14900dFB1Aa54e7674e1eCf9ce02b3b35157ba5',
    '0xd1C117319B3595fbc39b471AB1fd485629eb05F2',
    '0xa8b607Aa09B6A2E306F93e74c282Fb13f6A80452',
  ]
}

const chains = Object.entries(config)

export function vesper(timestamp: number = 0) {
  console.log("starting vesper");
  return Promise.all(chains.map(([chain, tokens]) => getYieldWrites({
    chain,
    timestamp,
    tokens,
    priceAbi: 'uint256:pricePerShare',
    underlyingAbi: 'address:token',
    projectName: 'vesper',
  })))
}
