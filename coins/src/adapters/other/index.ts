import synthetixAdapter from "./synthetix";
import glpAdapter from "./glp";
import abraAdapter from "./abracadabra";
import unknownTokenAdapter from "./unknownToken";
import podsAdapter from "./pods";
import distressedAdapter from "./distressedAssets";
import manualInputAdapter from "./manualInput";
import realtAdapter from "./realt";
import metronomeAdapter from "./metronome";
import { wrappedGasTokens } from "../utils/gasTokens";
import collateralizedAdapter from "./collateralizedAssets";
import swethAdapter from "./sweth";
import gmdAdapter from "./gmd";

export function synthetix(timestamp: number = 0) {
  console.log("starting synthetix");
  return synthetixAdapter(timestamp);
}

export function metronome(timestamp: number = 0) {
  console.log("starting metronome");
  return metronomeAdapter("ethereum", timestamp);
}

export function glp(timestamp: number = 0) {
  console.log("starting glp");
  return Promise.all([
    glpAdapter("arbitrum", timestamp),
    glpAdapter("avax", timestamp),
    glpAdapter("polygon", timestamp),
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
      "0xcD15C231b8A0Bae40bD7938AE5eA8e43f1e9a15F",
      "0x0D94e59332732D18CF3a3D457A8886A2AE29eA1B",
      "0xC348F894d0E939FE72c467156E6d7DcbD6f16e21",
      false,
      "songbird",
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
    unknownTokenAdapter(
      timestamp,
      "0x59b51516032241b796de4e495A90030C2d48BD1e",
      "0x9B377bd7Db130E8bD2f3641E0E161cB613DA93De", //stWEMIX
      "0x7D72b22a74A216Af4a002a1095C8C707d6eC1C5f",
      false,
      "wemix",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xC597952437Fa67B4a28bb03B19BF786AD26A4036",
      "0x1702EC380e924B0E12d5C2e838B6b91A1fB3A052", //bSERO
      "0x55d398326f99059fF775485246999027B3197955",
      false,
      "bsc",
    ),
    unknownTokenAdapter(
      timestamp,
      "0xeAdff72aBdA0709CD795CEFa3A44f45a22440144",
      "0x1f88e9956c8f8f64c8d5fef5ed8a818e2237112c", //UCON
      "0x55d398326f99059fF775485246999027B3197955",
      false,
      "bsc",
    ),
    unknownTokenAdapter(
      timestamp,
      "0x4b4237b385bd6eaf3ef6b20dbcaed4158a688af7",
      "0xD86c0B9b686f78a7A5C3780f03e700dbbAd40e01",
      "0xdac17f958d2ee523a2206206994597c13d831ec7",
      false,
      "ethereum",
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
    // distressedAdapter("harmony", timestamp),
    distressedAdapter("klaytn", timestamp),
    distressedAdapter("arbitrum", timestamp),
    distressedAdapter("bsc", timestamp),
    distressedAdapter("ethereum", timestamp),
    distressedAdapter("avax", timestamp),
    // distressedAdapter("cronos", timestamp),
    // distressedAdapter("solana", timestamp),
    distressedAdapter("fantom", timestamp),
  ]);
}
export function manualInput(timestamp: number = 0) {
  console.log("starting manualInputs");
  return Promise.all([
    manualInputAdapter("evmos", timestamp),
    manualInputAdapter("arbitrum", timestamp),
    manualInputAdapter("polygon", timestamp),
    manualInputAdapter("kava", timestamp),
  ]);
}
export function realt(timestamp: number = 0) {
  console.log("starting realt");
  return Promise.all([
    realtAdapter("ethereum", timestamp),
    realtAdapter("xdai", timestamp),
  ]);
}
export function collateralizedAssets(timestamp: number = 0) {
  console.log("starting collateralized assets");
  return collateralizedAdapter("arbitrum", timestamp, [
    {
      token: "0x52c64b8998eb7c80b6f526e99e29abdcc86b841b", // DSU
      vault: "0x0d49c416103cbd276d9c3cd96710db264e3a0c27",
      collateral: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    },
  ]);
}
export function sweth(timestamp: number = 0) {
  console.log("starting sweth");
  return swethAdapter(timestamp);
}
export function gmd(timestamp: number = 0) {
  console.log("starting gmd");
  return gmdAdapter(timestamp);
}
