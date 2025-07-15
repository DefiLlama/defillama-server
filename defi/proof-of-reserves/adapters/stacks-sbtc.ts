import axios from 'axios';
import { GetPoROptions } from '../types';
import { getBTCPriceUSD, getLlamaTvl } from '../utils/llamaApis';

const protocolId = 'stacks-sbtc';

export default {
  protocolId: protocolId,
  minted: async function(_: GetPoROptions): Promise<number> {
    const response = await axios.post('https://api.hiro.so/v2/contracts/call-read/SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4/sbtc-token/get-total-supply', {
      sender: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4',
      arguments: [],
    });

    const btcMinted = response.data ? parseInt(`0x${response.data.result.slice(6)}`, 16) / 1e8 : 0;
    return btcMinted * (await getBTCPriceUSD());
  },
  reserves: async function(): Promise<number> {
    return await getLlamaTvl(protocolId);
  },
}
