import { Token } from "./index";

export default async function bridge(): Promise<Token[]> {
  return [
    {
      from: "fantom:0x658b0c7613e890ee50b8c4bc6a3f41ef411208ad",
      to: "coingecko#ethereum",
      symbol: "FETH",
      decimals: 18
    }
  ];
}
