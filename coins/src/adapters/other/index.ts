import synthetixAdapter from "./synthetix";
import glpAdapter from "./glp";
import abraAdapter from "./abracadabra";
import unknownTokenAdapter from "./unknownToken";
import podsAdapter from "./pods";
import distressedAdapter from "./distressedAssets";
import manualInputAdapter from "./manualInput";
import { wrappedGasTokens } from "../utils/gasTokens";

export function synthetix(timestamp: number = 0) {
  console.log("starting synthetix");
  return synthetixAdapter(timestamp);
}
export function glp(timestamp: number = 0) {
  console.log("starting glp");
  return Promise.all([
    glpAdapter("arbitrum", timestamp),
    glpAdapter("avax", timestamp),
  ]);
}
export function abracadabra(timestamp: number = 0) {
  console.log("starting abracadabra");
  return abraAdapter(timestamp);
}
export function unknownTokens(timestamp: number = 0) {
  console.log("starting unknownTokens");
  return Promise.all([
    unknownTokenAdapter(
      timestamp,
      "0x09cabec1ead1c0ba254b09efb3ee13841712be14",
      "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359",
      wrappedGasTokens["ethereum"],
      true,
      "ethereum",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xa0feB3c81A36E885B6608DF7f0ff69dB97491b58",
      "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      "0x20f663CEa80FaCE82ACDFA3aAE6862d246cE0333",
      false,
      "bsc",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x604bd24343134066c16ffc3efce5d3ca160c1fee",
      "0x5b52bfb8062ce664d74bbcd4cd6dc7df53fd7233", //ZENIQ
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      false,
      "bsc",
    ),
  ]);
}
export function pods(timestamp: number = 0) {
  console.log("starting pods");
  return podsAdapter(timestamp);
}
export function distressed(timestamp: number = 0) {
  console.log("starting distressed");
  return Promise.all([
    distressedAdapter("harmony", timestamp),
    distressedAdapter("klaytn", timestamp),
    distressedAdapter("arbitrum", timestamp),
    distressedAdapter("bsc", timestamp),
    distressedAdapter("ethereum", timestamp),
  ]);
}
export function manualInput(timestamp: number = 0) {
  console.log("starting manualInputs");
  return Promise.all([
    manualInputAdapter("evmos", timestamp),
    manualInputAdapter("arbitrum", timestamp),
    manualInputAdapter("polygon", timestamp),
  ]);
}
