import { GetPoROptions } from '../types';
import { getTotalMinted } from '../utils/getReserves';
import { getBTCPriceUSD, getLlamaTvl } from '../utils/llamaApis';

const protocolId = 'function-fbtc';

// https://fbtc.com/proof-of-assets
// https://docs.fbtc.com/ecosystem/locked-fbtc-token/locked-fbtc-protocols-information
const mintedTokens = [
  {
    chain: 'ethereum',
    address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
  },
  {
    chain: 'ethereum',
    address: '0x3119a1AD5B63A000aB9CA3F2470611eB997B93B9',
  },
  {
    chain: 'ethereum',
    address: '0xd681C5574b7F4E387B608ed9AF5F5Fc88662b37c',
  },
  {
    chain: 'ethereum',
    address: '0xEb28877D7e3DbA5bcd4D0a1474C31F8AFb2d6052',
  },
  {
    chain: 'ethereum',
    address: '0x777B2913b1BB171A83cA3cdf79CB40523Ac76fDb',
  },
  {
    chain: 'mantle',
    address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
  },
  {
    chain: 'mantle',
    address: '0x3119a1AD5B63A000aB9CA3F2470611eB997B93B9',
  },
  {
    chain: 'mantle',
    address: '0xd681C5574b7F4E387B608ed9AF5F5Fc88662b37c',
  },
  {
    chain: 'mantle',
    address: '0x86680077DBC01eEd9C957470f89b2AB1dac72B53',
  },
  {
    chain: 'mantle',
    address: '0x93C6afA1882ea5E5bF403cA8fcb5aF87409EeCd0',
  },
  {
    chain: 'arbitrum',
    address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
  },
  {
    chain: 'bob',
    address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
  },
  {
    chain: 'bob',
    address: '0xEE03e367bcB59A9b4c1c0ea495A2e9cAC36372C8',
  },
  {
    chain: 'bob',
    address: '0xd681C5574b7F4E387B608ed9AF5F5Fc88662b37c',
  },
  {
    chain: 'base',
    address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
  },
  {
    chain: 'sonic',
    address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
  },
  {
    chain: 'bsc',
    address: '0xc96de26018a54d51c097160568752c4e3bd6c364',
  },
  {
    chain: 'bsc',
    address: '0x3119a1AD5B63A000aB9CA3F2470611eB997B93B9',
  },
  {
    chain: 'bsc',
    address: '0x2B25f4F134a56054b2b6388C2750F1eA3877e02b',
  },
  {
    chain: 'berachain',
    address: '0xbAC93A69c62a1518136FF840B788Ba715cbDfE2B',
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
