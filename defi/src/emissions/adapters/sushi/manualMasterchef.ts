import { AdapterResult } from "../../types/adapters";
type Rate = {
  start: number;
  rate: number;
};

const blocksPerPeriod: number = 191430;
const token: string = "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2";
const rates: Rate[] = [
  { start: 1601506800, rate: 90 },
  { start: 1604188800, rate: 80 },
  { start: 1606780800, rate: 70 },

  { start: 1609459200, rate: 60 },
  { start: 1612137600, rate: 50 },
  { start: 1614556800, rate: 40 },
  { start: 1617231600, rate: 30 },
  { start: 1619823600, rate: 20 },
  { start: 1622502000, rate: 18.6 },
  { start: 1625094000, rate: 17.3 },
  { start: 1627772400, rate: 16.08 },
  { start: 1630450800, rate: 13.91 },
  { start: 1633042800, rate: 12.94 },
  { start: 1635724800, rate: 12.03 },
  { start: 1638316800, rate: 11.19 },

  { start: 1640995200, rate: 10.41 },
  { start: 1643673600, rate: 9.68 },
  { start: 1646092800, rate: 9.002 },
  { start: 1648767600, rate: 8.372 },
  { start: 1651359600, rate: 7.786 },
  { start: 1654038000, rate: 7.241 },
  { start: 1656630000, rate: 6.373 },
  { start: 1659308400, rate: 6.263 },
  { start: 1661986800, rate: 5.824 },
  { start: 1664578800, rate: 5.417 },
  { start: 1667260800, rate: 5.037 },
  { start: 1669852800, rate: 4.685 },

  { start: 1672531200, rate: 4.357 },
  { start: 1675209600, rate: 4.052 },
  { start: 1677628800, rate: 3.768 },
  { start: 1680303600, rate: 3.504 },
  { start: 1682895600, rate: 3.259 },
  { start: 1685574000, rate: 3.031 },
  { start: 1688166000, rate: 2.819 },
  { start: 1690844400, rate: 2.622 },
  { start: 1696114800, rate: 2.438 },
  { start: 1698796800, rate: 0 },
];

export default function main(percentage: number): AdapterResult[] {
  const lines: AdapterResult[] = [];
  let cliff: number = 0;
  for (let i: number = 0; i < rates.length - 1; i++) {
    const start: number = rates[i].start;
    const end: number = rates[i + 1].start;
    const amount: number = rates[i].rate * blocksPerPeriod * percentage;
    cliff = +amount;

    lines.push({
      type: "linear",
      start,
      end,
      amount,
      cliff,
      token,
    });
  }

  return lines;
}
