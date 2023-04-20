const abi = require("./abi.json");
import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../utils/block";
import { getTokenInfo } from "../utils/erc20";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";

type GLPContract = { [chain: string]: { [contract: string]: string } }
const contracts: GLPContract = {
  arbitrum: {
    manager: "0x321f653eed006ad1c29d174e17d96351bde22649",
    glp: "0x4277f8f2c384827b5273592ff7cebd9f2c1ac258"
  },
  avax: {
    manager: "0xe1ae4d4b06A5Fe1fc288f6B4CD72f9F8323B107F",
    glp: "0x01234181085565ed162a948b6a5e88758cd7c7b8"
  }
};

const mvlpContracts: GLPContract = {
  polygon: {
    manager: "0x13e733ddd6725a8133bec31b2fc5994fa5c26ea9",
    glp: "0x9f4f8bc00f48663b7c204c96b932c29ccc43a2e8"
  }
}

export default async function getTokenPrice(chain: string, timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const writes: Write[] = [];
  await Promise.all([contracts, mvlpContracts].map(i => addContract(i, chain, block, writes, timestamp)))
  return writes;
}

async function addContract(contracts: GLPContract, chain: string, block: number | undefined, writes: Write[], timestamp: number) {
  if (!contracts[chain]) return;

  const [
    { output: aums },
    { output: pricePrecision },
    tokenInfos
  ] = await Promise.all([
    call({
      target: contracts[chain].manager,
      chain: chain as any,
      abi: abi.getAums,
      block
    }),
    call({
      target: contracts[chain].manager,
      chain: chain as any,
      abi: abi.pricePrecision,
      block
    }),
    getTokenInfo(chain, [contracts[chain].glp], block, { withSupply: true, })
  ]);

  const price =
    (aums[1] * 10 ** tokenInfos.decimals[0].output) /
    (tokenInfos.supplies[0].output * pricePrecision);

  addToDBWritesList(
    writes,
    chain,
    contracts[chain].glp,
    price,
    tokenInfos.decimals[0].output,
    tokenInfos.symbols[0].output,
    timestamp,
    "glp",
    1
  );

}