import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import bitcoinAddressBook from '../../DefiLlama-Adapters/projects/helper/bitcoin-book/index';
import axios from 'axios';
import { Balances } from "@defillama/sdk";
import { sumTokens } from "../../DefiLlama-Adapters/projects/helper/chain/bitcoin";

const adapter: IPoRAdapter = {
  assetLabel: 'sBTC',
  reserves: async function(_: GetPoROptions): Promise<GetPoRResult> {
    const result: GetPoRResult = {};

    const response = await axios.post('https://api.hiro.so/v2/contracts/call-read/SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4/sbtc-token/get-total-supply', {
      sender: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4',
      arguments: [],
    });
    if (response.data) {
      const mintedBalance = new Balances({
        chain: 'stacks',
      });
      mintedBalance.add('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token', parseInt(`0x${response.data.result.slice(6)}`, 16) / 1e8);
      result.stacks = {
        minted: mintedBalance,
        reserves: new Balances({
        chain: 'stacks',
      }),
      }
    }

    const addresses = bitcoinAddressBook.stacksSBTC;
    const reservesBalance = new Balances({
      chain: 'bitcoin',
    });
    const bitcoinBalances = await sumTokens({ owners: addresses, forceCacheUse: true } as any);
    const reserves = (bitcoinBalances as any).bitcoin ? Number((bitcoinBalances as any).bitcoin) : 0;
    reservesBalance.addToken('bitcoin', reserves);
    result.bitcoin = {
      minted: new Balances({
        chain: 'bitcoin',
      }),
      reserves: reservesBalance,
    }

    return result;
  }
}

export default adapter;


