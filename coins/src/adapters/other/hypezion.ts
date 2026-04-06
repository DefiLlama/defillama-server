import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

/**
 * HypeZion Finance — Token Pricing Adapter
 *
 * Provides pricing data for HypeZion protocol tokens on Hyperliquid L1:
 *   - hzUSD: stablecoin pegged to $1, price derived from on-chain NAV
 *   - BullHYPE: leverage token, price = zHYPE NAV in HYPE × HYPE price
 *   - shzUSD: staked hzUSD vault share, price = share price from ERC-4626
 */

const chain = "hyperliquid";

// Token addresses (Hyperliquid Mainnet)
const HZUSD = "0x6E2ade6FFc94d24A81406285c179227dfBFc97CE";
const BULLHYPE = "0x12cF926C3884dda144e18E11e2659c0675cF20eA";
const STAKED_HZUSD = "0xce01a9B9bc08f0847fb745044330Eff1181360Cd";

// HypeZionExchangeInformation proxy
// TODO: Verify address after deploying ExchangeInformation upgrade
const EXCHANGE_INFO = "0x9286ABAC7c29e8A183155E961a4E4BBA2E162c7A";

const abis = {
  getProtocolNavInUSD:
    "function getProtocolNavInUSD() view returns (uint256 zusdNav, uint256 zhypeNav, uint256 szusdNav, uint256 hypePrice)",
  totalAssets: "uint256:totalAssets",
  totalSupply: "uint256:totalSupply",
};

export default async function getTokenPrices(timestamp: number = 0) {
  const api = await getApi(chain, timestamp);
  const pricesObject: any = {};

  // Fetch NAVs from ExchangeInformation
  const navData = await api.call({
    target: EXCHANGE_INFO,
    abi: abis.getProtocolNavInUSD,
  });

  const zusdNav = Number(navData.zusdNav) / 1e18; // hzUSD NAV in USD (~$1)
  const zhypeNav = Number(navData.zhypeNav) / 1e18; // BullHYPE NAV in USD
  const szusdNav = Number(navData.szusdNav) / 1e18; // shzUSD NAV in USD (share price)

  // hzUSD — stablecoin pegged to $1
  if (zusdNav > 0) {
    pricesObject[HZUSD] = { price: zusdNav };
  }

  // BullHYPE — leverage token
  if (zhypeNav > 0) {
    pricesObject[BULLHYPE] = { price: zhypeNav };
  }

  // shzUSD — staked hzUSD vault share price
  if (szusdNav > 0) {
    pricesObject[STAKED_HZUSD] = { price: szusdNav };
  }

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "hypezion-finance",
  });
}
