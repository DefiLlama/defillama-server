import synthetixAdapter from "./synthetix";
import glpAdapter from "./glp";
import abraAdapter from "./abracadabra";
import saiAdapter from "./sai";
import podsAdapter from "./pods";

export function synthetix(timestamp: number = 0) {
  console.log("starting synthetix");
  return synthetixAdapter(timestamp);
}
export function glp(timestamp: number = 0) {
  console.log("starting glp");
  return Promise.all([
    glpAdapter("arbitrum", timestamp),
    glpAdapter("avax", timestamp)
  ]);
}
export function abracadabra(timestamp: number = 0) {
  console.log("starting abracadabra");
  return abraAdapter(timestamp);
}
export function sai(timestamp: number = 0) {
  console.log("starting sai");
  return saiAdapter(timestamp);
}
export function pods(timestamp: number = 0) {
  console.log("starting pods");
  return podsAdapter(timestamp);
}
