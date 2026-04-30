import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";
import { checkOracleFresh } from "../utils/oracle";

const chain = "ethereum";
const xaueToken = "0xd5D6840ed95F58FAf537865DcA15D5f99195F87a";
const oracle = "0x0618BD112C396060d2b37B537b3d92e757644169";
const xaut = "0x68749665FF8D2d112Fa859AA293F07A622782F38";

// Oracle returns the XAUE→XAUt rate (1e18 precision); `underlying: xaut` makes getWrites apply the XAUt/USD multiplier.
export async function xaue(timestamp: number = 0): Promise<Write[]> {
  const api = await getApi(chain, timestamp);
  const [latestPrice, updatedAt] = await Promise.all([
    api.call({ target: oracle, abi: "uint256:getLatestPrice" }),
    api.call({ target: oracle, abi: "uint256:lastUpdateTimestamp" }),
  ]);
  checkOracleFresh(updatedAt, {
    timestamp,
    label: "XAUE",
    maxAgeSeconds: 10 * 24 * 60 * 60, // XAUE oracle's published validity window is 10 days
  });
  const rate = Number(latestPrice) / 1e18;

  const pricesObject = {
    [xaueToken]: {
      price: rate,
      underlying: xaut,
      symbol: "XAUE",
      decimals: 18,
    },
  };

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "xaue",
  });
}