import { getCurrentUnixTimestamp } from "../../utils/date";
import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const vbillAddresses: { [key: string]: string } = {
  ethereum: "0x2255718832bC9fD3bE1CaF75084F4803DA14FF01",
  avax: "0x7F4546eF315Efc65336187Fe3765ea779Ac90183",
  bsc: "0x14d72634328C4D03bBA184A48081Df65F1911279",
  solana: "34mJztT9am2jybSukvjNqRjgJBZqHJsHnivArx1P4xy1",
};

export async function vbill(timestamp: number = 0) {
  const api = await getApi("ethereum", timestamp);
  const priceData = await api.call({
    abi: "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
    target: "0xA569E68B5D110F2A255482c2997DFDBe1b2ab912",
  });

  if (
    priceData.updatedAt <
    (timestamp == 0 ? getCurrentUnixTimestamp() : timestamp) - 27 * 60 * 60
  )
    throw new Error("VBILL price is stale");

  const writes: Write[] = [];
  Object.keys(vbillAddresses).map(async (chain) => {
    addToDBWritesList(
      writes,
      chain,
      vbillAddresses[chain],
      priceData.answer / 10 ** 8,
      6,
      "VBILL",
      timestamp,
      "vbill",
      1,
    );
  });

  return writes;
}
