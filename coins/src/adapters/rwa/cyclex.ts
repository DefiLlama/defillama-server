import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { getApi } from "../utils/sdk";
import * as ethers from 'ethers';

const lastedPriceABI = "function s_lastResponse() external view returns (bytes memory)"

const config = {
  base: {
    token: "0x14E3206C7146aCBc9274af8E2B0BEB4bB6e1eF54",
    oracle: "0x58985dDEda88032e9ABEad5A67d95Ba1e4F60345",
  }
}

async function getTokenPrices(chain: string, timestamp: number) {

  const api = await getApi(chain, timestamp);
  const writes: Write[] = [];

  const [decimals, symbol, totalSupply, priceBytes] = await Promise.all([
      api.call({ abi: "uint8:decimals", target: config.base.token }),
      api.call({ abi: "string:symbol", target: config.base.token }),
      api.call({ abi: "uint256:totalSupply", target: config.base.token }),
      api.call({ abi: lastedPriceABI, target: config.base.oracle })
  ]);

  const priceStr = ethers.toUtf8String(priceBytes);
  const totalSupplyStr = ethers.formatEther(totalSupply);
  
  addToDBWritesList(
    writes,
    chain,
    config.base.token,
    Number(priceStr) / Number(totalSupplyStr),
    decimals,
    symbol,
    timestamp,
    "cyclex-rwa",
    0.8,
  );
  return writes;
}

export function cyclex(timestamp: number = 0) {
  return getTokenPrices("base", timestamp);
}
