import protocols from "../protocols/data";
import treasuries from "../protocols/treasury";
import entities from "../protocols/entities";

export function getProtocol(name: string) {
  let protocol = protocols.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (!protocol) {
    protocol = treasuries.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
  }
  if (!protocol) {
    protocol = entities.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
  }
  if (protocol === undefined) {
    throw new Error("No protocol with that name");
  }
  return protocol;
}

export const date = (timestamp: number) =>
  "\t" + new Date(timestamp * 1000).toDateString();
