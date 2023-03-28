
import { compoundPrices } from "../utils/compound-fork";

const config = {
  arbitrum: '0x8e7e9ea9023b81457ae7e6d2a51b003d421e5408'
}

export function dforce(timestamp: number) {
  console.log("starting dforce");
  return Promise.all(Object.entries(config).map(([chain, comptroller]: any) => compoundPrices({
    chain, timestamp, comptroller, projectName: 'dforce', abis: {
      marketsAbi: 'address[]:getAlliTokens'
    }
  })))
}