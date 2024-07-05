import { compoundPrices } from "../../utils/compound-fork";
import getTokenPrices from "./compound";

export function compound(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "ethereum",
      "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b",
      timestamp,
    ),
  ]);
}
export function venus(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "bsc",
      "0xfd36e2c2a6789db23113685031d7f16329158384",
      timestamp,
    ),
  ]);
}
export function ironbank(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "ethereum",
      "0xAB1c342C7bf5Ec5F02ADEA1c2270670bCa144CbB",
      timestamp,
    ),
  ]);
}
export function benqi(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "avax",
      "0x486af39519b4dc9a7fccd318217352830e8ad9b4",
      timestamp,
    ),
  ]);
}
export function rari(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "arbitrum",
      "0xC7D021BD813F3b4BB801A4361Fbcf3703ed61716",
      timestamp,
    ),
  ]);
}
export function cream(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "arbitrum",
      "0xbadaC56c9aca307079e8B8FC699987AAc89813ee",
      timestamp,
    ),
    getTokenPrices(
      "polygon",
      "0x20ca53e2395fa571798623f1cfbd11fe2c114c24",
      timestamp,
    ),
    getTokenPrices(
      "bsc",
      "0x589de0f0ccf905477646599bb3e5c622c84cc0ba",
      timestamp,
    ),
  ]);
}
export function Ovix(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "polygon",
      "0x8849f1a0cB6b5D6076aB150546EddEe193754F1C",
      timestamp,
    ),
    getTokenPrices(
      "polygon_zkevm",
      "0x6EA32f626e3A5c41547235ebBdf861526e11f482",
      timestamp,
    ),
  ]);
}
export function scream(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "fantom",
      "0x260e596dabe3afc463e75b6cc05d8c46acacfb09",
      timestamp,
    ),
  ]);
}
export function aurigami(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "aurora",
      "0x817af6cfAF35BdC1A634d6cC94eE9e4c68369Aeb",
      timestamp,
    ),
  ]);
}
export function traderjoe(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "avax",
      "0xdc13687554205E5b89Ac783db14bb5bba4A1eDaC",
      timestamp,
    ),
  ]);
}
export function mare(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices(
      "kava",
      "0x4804357ace69330524ceb18f2a647c3c162e1f95",
      timestamp,
    ),
  ]);
}
export function tonpound(timestamp: number = 0) {
  return getTokenPrices(
    "ethereum",
    "0x79645effe4dc7df2ecf52e267d56c98d239fd838",
    timestamp,
  );
}

export function lodestar(timestamp: number = 0) {
  return getTokenPrices(
    "arbitrum",
    "0x92a62f8c4750D7FbDf9ee1dB268D18169235117B",
    timestamp,
  );
}
export function marev2(timestamp: number = 0) {
  return getTokenPrices(
    "kava",
    "0xFcD7D41D5cfF03C7f6D573c9732B0506C72f5C72",
    timestamp,
  );
}
export function tenderfi(timestamp: number = 0) {
  return getTokenPrices(
    "arbitrum",
    "0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e",
    timestamp,
  );
}

export function cantoLending(timestamp: number = 0) {
  return compoundPrices({
    chain: "canto",
    timestamp,
    cether: "0xB65Ec550ff356EcA6150F733bA9B954b2e0Ca488",
    comptroller: "0x5e23dc409fc2f832f83cec191e245a191a4bcc5c",
    projectName: "canto-lending",
  });
}
export function sumerian(timestamp: number = 0) {
  return getTokenPrices(
    "meter",
    "0xcb4cdda50c1b6b0e33f544c98420722093b7aa88",
    timestamp,
  );
}
export function hover(timestamp: number = 0) {
  return getTokenPrices(
    "kava",
    "0x3A4Ec955a18eF6eB33025599505E7d404a4d59eC",
    timestamp,
  );
}

export function moonwell(timestamp: number = 0) {
  return getTokenPrices(
    "base",
    "0xfBb21d0380beE3312B33c4353c8936a0F13EF26C",
    timestamp,
  );
}

export function orbitv2(timestamp: number = 0) {
  return getTokenPrices(
    "blast",
    "0x1E18C3cb491D908241D0db14b081B51be7B6e652",
    timestamp,
  );
}

export const adapters = {
  cantoLending,
  moonwell,
  hover,
  sumerian,
  compound,
  venus,
  ironbank,
  benqi,
  traderjoe,
  rari,
  aurigami,
  cream,
  scream,
  tonpound,
  lodestar,
  marev2,
  tenderfi,
  Ovix,
  mare,
  orbitv2,
}