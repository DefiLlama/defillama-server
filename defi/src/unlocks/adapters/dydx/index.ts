import { Allocation, Contracts, Exports } from "../../types/adapters";
import { periodToSeconds, readableToSeconds } from "../../utils/time";
// 850M uncirc
const notableContracts: Contracts = {
  rewardsTreasury: "0xb9431E19B29B952d9358025f680077C3Fd37292f", // 269M
  communityTreasury: "0xE710CEd57456D3A16152c32835B5FB4E72D9eA5b", // 35M
  communityTreasury2: "0x08a90Fe0741B7DeF03fB290cc7B273F1855767D8", // 36M
  distributor: "0x639192D54431F8c816368D3FB4107Bc168d0E871", // 16M
  staking: "0x65f7BA4Ec257AF7c55fd5854E5f6356bBd0fb8EC", // 14M
};
const epoch: number = 28 * periodToSeconds.day
const timestampFrom: number = 1627999200

const vestingSchedule: Allocation = {
  insiders: [{
    name: "past investors",
    total: 277_295_070,
    from: 1627999200,
    until: 0,
    schedule: (timestamp: number): number => {
      const monthsPassed = Math.floor((timestamp - timestampFrom) / periodToSeconds.month)
      let circulating = 0
      const total = 277_295_070
      for (let i = 0; i < monthsPassed; i++) {
        if (i < 18) continue
        if (i < 24) circulating += (total * 0.4 / 6)
        if (i < 36) circulating += (total * 0.2 / 12)
        if (i < 48) circulating += (total * 0.1 / 12)
      }
      if (circulating < total) return circulating
      return total
    } // 18mo cliff, 40% over 6mo, 20% over 12mo, 10% over 12mo
  }],
  community: [
    {
      name: 'traders',
      total: 250_000_000,
      from: 1627999200,
      schedule: (timestamp: number): number => {
        const epochsPassed = Math.floor((timestamp - timestampFrom) / epoch)
        if (epochsPassed < 15) return 3_835_616 * epochsPassed
        return 53_698_624 + (epochsPassed - 14) * 2_876_712 // reduction was given by DAO
      } 
    },
    {
      name: 'retroactive rewards',
      total: 75_000_000,
      from: 1627999200,
      schedule: 75_000_000
    }
  ]

}
async function cap(timestamp: number) {
  const softCap =  1_000_000_000
  const inflationRate = 1.02
  const inflationaryStart = readableToSeconds('2026-07-14T15:00')

  if (timestamp < inflationaryStart) return softCap

  const yearsSinceInflation = (timestamp - inflationaryStart) / periodToSeconds.year
  return softCap * yearsSinceInflation ** inflationRate
}
const ex: Exports = {
  timestampFrom,
  sources: ["https://docs.dydx.community/dydx-governance/start-here/dydx-allocations"],
  vestingSchedule,
  comments: "",
  cap,
  // for ID just match the adapter folder name here to the TVL one
};
export default ex