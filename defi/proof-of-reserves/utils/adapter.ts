import { GetPoROptions, GetPoRResult } from "../types";
import { sumTokens } from '../../DefiLlama-Adapters/projects/helper/chain/bitcoin';
import { getTokenSupplies } from '../../DefiLlama-Adapters/projects/helper/solana';
import ADDRESSES from "../../DefiLlama-Adapters/projects/helper/coreAssets.json";
import { Balances } from "@defillama/sdk";
import * as sdk from "@defillama/sdk";

interface ReserveConfigs {
  [key: string]: {
    minted?: Array<{
      address: string;
      decimals?: number;
    }>;
    reserves?: {
      countNative?: boolean;
      tokens?: Array<string>;
      owners: Array<string>;
    }
  }
}

export async function getReserves(_: GetPoROptions, configs: ReserveConfigs): Promise<GetPoRResult> {
  const result: GetPoRResult = {};

  for (const [chain, config] of Object.entries(configs)) {
    const mintedBalance = new Balances({
      chain: chain,
    });
    const reserveBalance = new Balances({
      chain: chain,
    });

    if (config.minted) {
      for (const mintedToken of config.minted) {
        if (chain === 'solana') {
          const data = await getTokenSupplies([mintedToken.address]);
          const totalSupply: any = Number((data as any)[mintedToken.address]) / (mintedToken.decimals ? 10**mintedToken.decimals : 1e8);
          mintedBalance.addToken(mintedToken.address, totalSupply);
        } else {
          // evm
          const supply = await sdk.api2.abi.call({
            chain: chain,
            target: mintedToken.address,
            abi: 'uint256:totalSupply',
          });
          const decimals = await sdk.api2.abi.call({
            chain: chain,
            target: mintedToken.address,
            abi: 'uint8:decimals',
          });
          const totalSupply = Number(supply) / 10**Number(decimals)
          mintedBalance.addToken(mintedToken.address, totalSupply);
        }
      }
    }

    if (config.reserves) {
      if (chain === 'bitcoin') {
        const bitcoinBalances = await sumTokens({ owners: config.reserves.owners, forceCacheUse: true } as any);
        const reserves = (bitcoinBalances as any).bitcoin ? Number((bitcoinBalances as any).bitcoin) : 0;
        reserveBalance.addToken('bitcoin', reserves);
      } else {
        // evm
        if (config.reserves.tokens) {
          for (const token of config.reserves.tokens) {
            const decimals = await sdk.api2.abi.call({
              chain: chain,
              target: token,
              abi: 'uint8:decimals',
            });

            const balances = await sdk.api2.abi.multiCall({
              chain: chain,
              abi: 'function balanceOf(address) view returns(uint256)',
              target: token,
              calls: config.reserves.owners.map(owner => {
                return {
                  params: [owner],
                }
              })
            });
            for (const balance of balances) {
              reserveBalance.add(token, Number(balance) / 10**Number(decimals));
            }
          }
        }

        if (config.reserves.countNative) {
          for (const owner of config.reserves.owners) {
            const {output: balance} = await sdk.api2.eth.getBalance({
              chain: chain,
              target: owner,
            });
            reserveBalance.add(ADDRESSES.null, Number(balance) / 1e18);
          }
        }
      }
    }

    result[chain] = {
      minted: mintedBalance,
      reserves: reserveBalance,
    }
  }

  return result;
}
