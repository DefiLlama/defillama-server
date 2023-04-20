import { getCurrentUnixTimestamp } from "../../../utils/date";
import { Write } from "../../utils/dbInterfaces";

export default async function getTokenPrices(timestamp: number) {
  const chain = "bsc";
  let writes: Write[];
  if (timestamp == 0) {
    writes = [
      {
        SK: 0,
        PK: `asset#${chain}:0x1075bea848451a13fd6f696b5d0fda52743e6439`,
        symbol: "aETHb",
        decimals: 18,
        redirect: "coingecko#ethereum",
        timestamp: getCurrentUnixTimestamp(),
        adapter: "ankr",
        confidence: 0.9
      },
      {
        SK: getCurrentUnixTimestamp(),
        PK: `asset#${chain}:0x1075bea848451a13fd6f696b5d0fda52743e6439`,
        symbol: "aETHb",
        decimals: 18,
        redirect: "coingecko#ethereum",
        adapter: "ankr",
        confidence: 0.9
      },
      {
        SK: 0,
        PK: `asset#${chain}:0x7465b49f83bfd74e8df8574d43bfff34edbc1758`,
        symbol: "aMATICb",
        decimals: 18,
        redirect: "coingecko#matic-network",
        timestamp: getCurrentUnixTimestamp(),
        adapter: "ankr",
        confidence: 0.9
      },
      {
        SK: getCurrentUnixTimestamp(),
        PK: `asset#${chain}:0x7465b49f83bfd74e8df8574d43bfff34edbc1758`,
        symbol: "aMATICb",
        decimals: 18,
        redirect: "coingecko#matic-network",
        adapter: "ankr",
        confidence: 0.9
      }
    ];
  } else {
    writes = [
      {
        SK: getCurrentUnixTimestamp(),
        PK: `asset#${chain}:0x1075bea848451a13fd6f696b5d0fda52743e6439`,
        symbol: "aETHb",
        decimals: 18,
        redirect: "coingecko#ethereum",
        adapter: "ankr",
        confidence: 0.9
      },
      {
        SK: getCurrentUnixTimestamp(),
        PK: `asset#${chain}:0x7465b49f83bfd74e8df8574d43bfff34edbc1758`,
        symbol: "aMATICb",
        decimals: 18,
        redirect: "coingecko#matic-network",
        adapter: "ankr",
        confidence: 0.9
      }
    ];
  }
  return writes;
}
