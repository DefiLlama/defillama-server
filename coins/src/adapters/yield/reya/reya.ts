const abi = require("./abi.json");
import * as sdk from '@defillama/sdk'
const { call, } = sdk.api.abi
import getBlock from "../../utils/block";
import { getTokenInfo } from "../../utils/erc20";
import { Write } from "../../utils/dbInterfaces";
import { addToDBWritesList } from "../../utils/database";

const ORACLE_MANAGER = "0xC67316Ed17E0C793041CFE12F674af250a294aab";

const token_oracle_id: { [token: string]: string } = {
    "0x63FC3F743eE2e70e670864079978a1deB9c18b76": "0x42daefd962c3b559d6e382fcbc0e89e3fb7d87e836025141066e2f1f02fd5e99",
    "0xb6A307Bb281BcA13d69792eAF5Db7c2BBe6De248": "0x32cbf6a5839965f0e6439db08f6e9ec0250c2bc6af874f153616ed8d66dd139e",
    "0x3ee6f82498d4e40DB33bac3adDABd8b41eCa1c9c": "0x9a1aef8f05fbbb282f9a65374552602898df8f3bacaf12f1c6ba000c4eb901bb"
}

const PRICE_DECIMALS = 18;

async function getOracleInfos(
    block: number | undefined,
    chain: any,
    token: string,
  ) {
    const [{ output }, tokenInfos] = await Promise.all([
        call({
          target: ORACLE_MANAGER,
          chain,
          abi: abi.process,
          params: [token_oracle_id[token]],
          block,
        }),
        getTokenInfo(chain, [token], block),
      ]);
      return { price_output: output[0], tokenAddress: token, tokenInfos };
  }

export default async function getTokenPrices(timestamp: number, chain: string) {
    const block: number | undefined = await getBlock(chain, timestamp);

    const datas = await Promise.all(
        Object.keys(token_oracle_id).map((token) => {
            return getOracleInfos(block, chain, token);
        })
    )

    const writes: Write[] = [];
    datas.map(({ price_output, tokenAddress, tokenInfos }) => {
        const price = price_output / 10 ** PRICE_DECIMALS;
        addToDBWritesList(
          writes,
          chain,
          tokenAddress,
          price,
          tokenInfos.decimals[0].output,
          tokenInfos.symbols[0].output,
          timestamp,
          "reya",
          1,
        );
    });
    return writes;
}