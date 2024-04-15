import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";

export async function hiyield(timestamp: number): Promise<Write[]> {
  console.log("starting hiyield");
  const chain = "canto";
  const address = "0x0E4289a95207CA653b60B0eB0b5848f29F4C3f72";
  const symbol = "hyVWEAX";
  const api = await getApi("canto", timestamp);
  const poolInfo = await api.call({
    abi: "function poolInfo() external view returns(uint256, uint256, uint256, uint256, uint256)",
    target: address,
  });

  const tokenPrice = poolInfo[4] / 1e18;

  const writes: Write[] = [];

  addToDBWritesList(
    writes,
    chain,
    address,
    tokenPrice,
    18,
    symbol,
    timestamp,
    "hiyield-rwa",
    0.8
  );

  return writes;
}
