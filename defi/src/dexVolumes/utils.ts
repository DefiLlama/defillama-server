import fetch from "node-fetch";

import { BreakdownAdapter, VolumeAdapter } from "./dexVolume.types";

export const getEcosystemBlocks = (ecosystem: string, timestamp: number) =>
  fetch(`https://coins.llama.fi/block/${ecosystem}/${timestamp}`).then((res) =>
    res.json()
  );
export const getAllEcosystemBlocks = async (
  breakdown: BreakdownAdapter,
  timestamp: number
) => {
  const allEcosystems = getAllBreakdownEcosystems(breakdown);

  const chainBlocks = (
    await Promise.all(
      allEcosystems.map(async (ecosystem) => ({
        ecosystem: await getEcosystemBlocks(ecosystem, timestamp),
      }))
    )
  ).reduce((acc, curr) => ({ ...acc, ...curr }), {});
  return chainBlocks;
};

export const getAllVolumeBlocks = () => {};

export const getVolumeEcosystems = (volume: VolumeAdapter) =>
  Object.keys(volume);

export const getAllBreakdownEcosystems = (
  breakdown: BreakdownAdapter
): string[] => {
  const uniqueEcosystems = new Set<string>();
  Object.values(breakdown).forEach((volume) => {
    getVolumeEcosystems(volume).forEach((ecosystem) =>
      uniqueEcosystems.add(ecosystem)
    );
  });
  return [...uniqueEcosystems];
};

// v1: {
//   [ETHEREUM]: {
//     fetch: v1Graph(ETHEREUM),
//     start: getStartTimestamp({
//       endpoints: v1Endpoints,
//       chain: ETHEREUM,
//       volumeField: "dailyVolumeInUSD",
//     }),
//   },
// },
// v2: {
//   [ETHEREUM]: {
//     fetch: v2Graph(ETHEREUM),
//     start: getStartTimestamp({
//       endpoints: v2Endpoints,
//       chain: ETHEREUM,
//     }),
//   },
// },

// export const getAllBreakdownBlocks = async () =>  Object.fromEntries(
//       await Promise.all(
//         Object.entries(allEcosystemStarts).map(
//           // TODO Fix all adapter types first before typing
//           async ([ecosystem, start]: [any, number]) => {
//             const res = await getBlocksFromStart(
//               start,
//               ecosystem,
//               currentTimestamp,
//               limit
//             );
//             return [ecosystem, res];
//           }
//         )
//       )
//     );
