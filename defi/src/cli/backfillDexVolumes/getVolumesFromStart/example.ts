import pThrottle from "../../../utils/pThrottle";

import { volume } from "../../../../DefiLlama-Adapters/dexVolumes/traderjoe";
import { past25BlocksFrom1641081600 } from "../fixtures";
import { getChainBlocksRetry } from "../../utils";
import getBlocksFromStart from "../getBlocksFromStart";

import fs from "fs";
import path from "path";

// const { fetch } = volume.avax;

// const throttle = pThrottle({
//   limit: 100,
//   interval: 1050,
// });

// const throttleFetch = throttle(fetch);

// const past25TimestampsFrom1641081600 = Object.entries(
//   past25BlocksFrom1641081600.avax
// );

// const main = async () => {
//   await Promise.all(
//     [
//       ...past25TimestampsFrom1641081600,
//       ...past25TimestampsFrom1641081600,
//       ...past25TimestampsFrom1641081600,
//       ...past25TimestampsFrom1641081600,
//     ].map(([timestamp, block]) => throttleFetch(timestamp, { avax: block }))
//   );

//   console.log("test 1");
//   await Promise.all(
//     [
//       ...past25TimestampsFrom1641081600,
//       ...past25TimestampsFrom1641081600,
//       ...past25TimestampsFrom1641081600,
//       ...past25TimestampsFrom1641081600,
//     ].map(([timestamp, block]) => throttleFetch(timestamp, { avax: block }))
//   );

//   console.log("test 2");

//   const requests = await Promise.all(
//     [
//       ...past25TimestampsFrom1641081600,
//       ...past25TimestampsFrom1641081600,
//       ...past25TimestampsFrom1641081600,
//       ...past25TimestampsFrom1641081600,
//     ].map(([timestamp, block]) => throttleFetch(timestamp, { avax: block }))
//   );

//   console.log(requests, "requests");
//   console.log(requests.length, "requests.length");
// };

// main();

// getChainBlocksRetry(1636848000, "ethereum", 5).then((res) => {

//   fs.

//   console.log(res)
// });

const res1 = await getBlocksFromStart(
  1541116800,
  "ethereum",
  Date.now() / 1000,
  100
).then((res) => {
  fs.writeFileSync(path.join(__dirname, "ethblocks"), JSON.stringify(res));
  console.log(res);
});
