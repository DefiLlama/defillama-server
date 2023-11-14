import { Address } from "@defillama/sdk/build/types";
import fetch from "node-fetch";

export async function arbitrum(): Promise<Address[]> {
  return (await fetch("https://bridge.arbitrum.io/token-list-42161.json").then((r) => r.json())).tokens.map(
    (token: any) => token.address
  );
}
