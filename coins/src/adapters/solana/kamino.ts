import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";

import rpcProxy from "../utils/rpcProxy";

const markets: string[] = [
  "DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek",
  "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
];

export async function kamino(timestamp: number) {
  if (timestamp != 0) throw new Error(`Kamino adapter only works for current`);

  const reserves: any[] = (await Promise.all(markets.map(rpcProxy.kamino.reserves))).flat();

  const writes: Write[] = [];
  for (let { price, token, decimals, symbol } of reserves) {

    addToDBWritesList(writes, "solana", token, price, decimals, `Kamino Reserve Collateral (${symbol}) Token`, timestamp, "kamino", 0.8,);
  }

  return writes;
}
