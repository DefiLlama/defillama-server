import {getCoinPrices} from './llamaApis';
import { getTokenSupplies } from '../../DefiLlama-Adapters/projects/helper/solana';
import { TokenConfig } from '../types';
import * as sdk from '@defillama/sdk';

function getCoinPrice(coinPrices: Record<string, number>, token: TokenConfig): number {
  const key = `${token.chain}:${token.address}`;
  if (!coinPrices[key]) {
    console.warn(`failed to get coin price ${key}`)
    process.exit(1);
  }
  return coinPrices[key] ? coinPrices[key] : 0;
}

export async function getTotalMinted(tokens: Array<TokenConfig>, getUsdValue: boolean | undefined = undefined, excludeWallets: Array<string> | undefined = undefined): Promise<number> {
  const coinPrices = await getCoinPrices(tokens);

  let totalMinted = 0;

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
        for (const wallet of excludeWallets) {
          const balanceOf = await sdk.api2.abi.call({
            chain: token.chain,
            target: token.address,
            abi: 'function balanceOf(address) view returns (uint256)',
            params: [wallet],
          });
          const balance = Number(balanceOf) / 10**Number(decimals);

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
