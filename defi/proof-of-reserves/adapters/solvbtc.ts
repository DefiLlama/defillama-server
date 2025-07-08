import { GetPoROptions } from '../types';
import { getTotalMinted } from '../utils/getReserves';
import { getBTCPriceUSD, getLlamaTvl } from '../utils/llamaApis';

const protocolId = 'solvbtc';

const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0x7A56E1C57C7475CCf742a1832B028F0456652F97',
  },
  {
    chain: 'arbitrum',
    address: '0x3647c54c4c2C65bC7a2D63c0Da2809B399DBBDC0',
  },
  {
    chain: 'bsc',
    address: '0x4aae823a6a0b376De6A78e74eCC5b079d38cBCf7',
  },
  {
    chain: 'avax',
    address: '0xbc78D84Ba0c46dFe32cf2895a19939c86b81a777',
  },
  {
    chain: 'bob',
    address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77',
  },
  {
    chain: 'base',
    address: '0x3B86Ad95859b6AB773f55f8d94B4b9d443EE931f',
  },
  {
    chain: 'linea',
    address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77',
  },
  {
    chain: 'core',
    address: '0x9410e8052bc661041e5cb27fdf7d9e9e842af2aa',
  },
  {
    chain: 'taiko',
    address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77',
  },
  {
    chain: 'btr',
    address: '0x541fd749419ca806a8bc7da8ac23d346f2df8b77',
  },
  {
    chain: 'mode',
    address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77',
  },
  {
    chain: 'corn',
    address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77',
  },
  {
    chain: 'sonic',
    address: '0x541fd749419ca806a8bc7da8ac23d346f2df8b77',
  },
  {
    chain: 'soneium',
    address: '0x541fd749419ca806a8bc7da8ac23d346f2df8b77',
  },
  {
    chain: 'rsk',
    address: '0x541fd749419ca806a8bc7da8ac23d346f2df8b77',
  },
  {
    chain: 'berachain',
    address: '0x541fd749419ca806a8bc7da8ac23d346f2df8b77',
  },
  {
    chain: 'sei',
    address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77',
  },
  {
    chain: 'era',
    address: '0x74eD17608cc2B5f30a59d6aF07C9aD1B1aB3A5b1',
  },
  {
    chain: 'hyperliquid',
    address: '0xae4efbc7736f963982aacb17efa37fcbab924cb3',
  },
  {
    chain: 'ink',
    address: '0xae4efbc7736f963982aacb17efa37fcbab924cb3',
  },
]

export default {
  protocolId: protocolId,
  minted: async function(_: GetPoROptions): Promise<number> {
    const totalMinted = await getTotalMinted(mintedTokens);
    return totalMinted * (await getBTCPriceUSD());
  },
  reserves: async function(): Promise<number> {
    return await getLlamaTvl(protocolId);
  },
}
