import { calcMonthlyVolume, calcHourlyVolume, calcDailyVolume } from "../";
import { twoMonthAllEcosystemVolumes, hourlyVolumes } from "../fixtures";

const res: any = {};

// [1638316800, 1640995200].forEach((i) => {
//   const { monthlyVolume, totalVolume, ecosystems } = calcMonthlyVolume({
//     allEcosystemVolumes: twoMonthAllEcosystemVolumes,
//     ecosystemNames: ["ngmi", "llama"],
//     timestamp: i,
//     end: 1643180400,
//   });

//   res[i] = {
//     id: 468,
//     unix: i,
//     monthlyVolume,
//     totalVolume,
//     breakdown: {
//       main: ecosystems,
//     },
//   };
// });

// for (let i = 0; i < 24; i++) {
//   const timestamp = 1643180400 - 3600 * i;
//   const { hourlyVolume, dailyVolume, totalVolume, ecosystems } =
//     calcHourlyVolume({
//       allEcosystemVolumes: twoMonthAllEcosystemVolumes,
//       ecosystemNames: ["ngmi", "llama"],
//       timestamp,
//     });

//   res[timestamp - 3600] = {
//     id: 468,
//     unix: timestamp - 3600,
//     hourlyVolume,
//     dailyVolume,
//     totalVolume,
//     breakdown: {
//       main: ecosystems,
//     },
//   };
// }

for (let i = 1638316800; i < 1643180400; i += 86400) {
  const { dailyVolume, totalVolume, ecosystems } = calcDailyVolume({
    allEcosystemVolumes: twoMonthAllEcosystemVolumes,
    ecosystemNames: ["ngmi", "llama"],
    timestamp: i,
    end: 1643180400,
  });

  res[i] = {
    id: 468,
    unix: i,
    dailyVolume,
    totalVolume,
    breakdown: {
      main: ecosystems,
    },
  };
}

console.log(JSON.stringify(res));
// console.log(Object.keys(hourlyVolumes).length);
