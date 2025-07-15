import {getCoinPrices} from './llamaApis';
import { getTokenSupplies } from '../../DefiLlama-Adapters/projects/helper/solana';
import { TokenConfig } from '../types';
import * as sdk from '@defillama/sdk';

function getCoinPrice(coinPrices: Record<string, number>, token: TokenConfig): number {
  const key = token.llamaCoinPriceId ? token.llamaCoinPriceId : `${token.chain}:${token.address}`;
  if (!coinPrices[key]) {
    console.warn(`WARN - failed to get coin price ${token.chain}:${token.address}`)
  }
  return coinPrices[key] ? coinPrices[key] : 0;
}

export async function getTotalMinted(tokens: Array<TokenConfig>, getUsdValue: boolean | undefined = undefined, excludeWallets: Array<string> | undefined = undefined): Promise<number> {
  const coinPrices = await getCoinPrices(tokens);

  let totalMinted = 0;

  // group token by chain
  const tokenByChains: {[key: string]: Array<TokenConfig>} = {};
  for (const token of tokens) {
    if (!tokenByChains[token.chain]) {
      tokenByChains[token.chain] = [];
    }
    tokenByChains[token.chain].push(token);
  }

  for (const token of tokens) {
    if (token.chain === 'solana') {
      const data = await getTokenSupplies([token.address]);
      const totalSupply: any = Number((data as any)[token.address]) / (token.decimals ? 10**token.decimals : 1e8);
      if (getUsdValue) {
        totalMinted += totalSupply * getCoinPrice(coinPrices, token);
      } else {
        totalMinted += totalSupply;
      }
    } else {
      // evm
      const supply = await sdk.api2.abi.call({
        chain: token.chain,
        target: token.address,
        abi: 'uint256:totalSupply',
      });
      const decimals = await sdk.api2.abi.call({
        chain: token.chain,
        target: token.address,
        abi: 'uint8:decimals',
      });
      const totalSupply = Number(supply) / 10**Number(decimals);

      if (getUsdValue) {
        totalMinted += totalSupply * getCoinPrice(coinPrices, token);
      } else {
        totalMinted += totalSupply;
      }

      if (excludeWallets) {
        const excludeWalletsBalances = await sdk.api2.abi.multiCall({
          chain: token.chain,
          abi: 'function balanceOf(address) view returns (uint256)',
          calls: excludeWallets.map(address => {
            return {
              target: token.address,
              params: [address],
            }
          })
        })
        for (const walletBalance of excludeWalletsBalances) {
          const balance = Number(walletBalance) / 10**Number(decimals);
          if (getUsdValue) {
            totalMinted -= balance * getCoinPrice(coinPrices, token);
          } else {
            totalMinted -= balance;
          }
        }
      }
    }
  }

  return totalMinted;
}
