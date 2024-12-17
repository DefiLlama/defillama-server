import axios from "axios";
import getWrites from "../utils/getWrites";

const chain = "rsk";

const usdRIFToken = {
  address: "0x3a15461d8ae0f0fb5fa2629e9da7d66a794a6e37",
  symbol: "USDRIF",
  decimals: 18,
};

export function usdrif(timestamp: number = 0) {
  return getTokenPrice(timestamp);
}

async function getTokenPrice(timestamp: number) {

  const response = await axios.get(`https://api.geckoterminal.com/api/v2/networks/rootstock/tokens/${usdRIFToken.address}/pools`)

  const [pool] = response.data.data;
  const price = pool.attributes.token_price_usd;
  const pricesObject: { [key: string]: any } = {};
  
  pricesObject[usdRIFToken.address] = {
    token: usdRIFToken.address,
    price,
    symbol: usdRIFToken.symbol,
    decimals: usdRIFToken.decimals,
  };

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "usdrif",
  });
}