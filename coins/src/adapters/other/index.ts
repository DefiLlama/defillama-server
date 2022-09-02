import synthetixAdapter from "./synthetix";
import glpAdapter from "./glp";

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
