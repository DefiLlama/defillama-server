import * as sdk from '@defillama/sdk';
import { GetPoROptions, IPoRAdapter } from '../types';
import { getBTCPriceUSD } from './llamaApis';

async function getTokenMinted(tokens: Array<any>): Promise<number> {
  let totalMinted = 0;
  for (const token of tokens) {
    const totalSupply = await sdk.api2.abi.call({
      chain: token.chain,
      target: token.address,
      abi: 'uint256:totalSupply',
    });
    const decimals = await sdk.api2.abi.call({
      chain: token.chain,
      target: token.address,
      abi: 'uint8:decimals',
    });

    totalMinted += Number(totalSupply) / (10**Number(decimals))
  }

  return totalMinted;
}

async function getTokenReserves(tokens: Array<any>): Promise<number> {
  let totalReserves = 0;
  for (const token of tokens) {
    const balances = await sdk.api2.abi.multiCall({
      chain: token.chain,
      abi: 'function balanceOf(address) view returns (uint256)',
      calls: token.owners.map((owner: string) => {
        return {
          target: token.address,
          params: [owner],
        }
      }),
    });
    const decimals = await sdk.api2.abi.call({
      chain: token.chain,
      target: token.address,
      abi: 'uint8:decimals',
    });

    for (const balance of balances) {
      totalReserves += Number(balance) / (10**Number(decimals))
    }
  }
  return totalReserves;
}

export function getBridgeLockAndMintAdapter(protocolId: string, mintedTokens: Array<any>, reservesTokens: Array<any>): IPoRAdapter {
  return {
    protocolId: protocolId,
    minted: async function(_: GetPoROptions): Promise<number> {
      return await getTokenMinted(mintedTokens);
    },
    reserves: async function(): Promise<number> {
      return await getTokenReserves(reservesTokens);
    },
  }
}

export function getBitcoinBridgeLockAndMintAdapter(protocolId: string, mintedTokens: Array<any>, reservesTokens: Array<any>): IPoRAdapter {
  return {
    protocolId: protocolId,
    minted: async function(_: GetPoROptions): Promise<number> {
      return (await getTokenMinted(mintedTokens)) * (await getBTCPriceUSD());
    },
    reserves: async function(): Promise<number> {
      return (await getTokenReserves(reservesTokens)) * (await getBTCPriceUSD());
    },
  }
}
