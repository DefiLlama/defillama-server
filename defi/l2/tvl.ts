import { outgoing } from "./outgoing";
import { incoming } from "./incoming";
import { minted } from "./minted";
import { metadata } from "./metadata";

export async function main() {
  const allOutgoing = await outgoing();
  const allIncoming = await Promise.all(Object.keys(allOutgoing).map((chain: string) => incoming({ chain })));
  const allMinted = await Promise.all(Object.keys(allOutgoing).map((chain: string) => minted({ chain })));
  const allMetadata = await Promise.all(Object.keys(allOutgoing).map((chain: string) => metadata(chain)));
}
