import { fetchHistoricalFromDB } from "../storeToDb";
async function main() {
  const data = await fetchHistoricalFromDB();
  process(data);
}
let cache: any[] = [];

function process(data: any) {
  data.map((prev: any, i: number) => {
    if (i == data.length - 1) return;
    const curr: any = data[i + 1];
    Object.keys(prev.data).map((chain: string) => {
      const total = curr.data[chain]?.total?.total;
      if (!total) return;
      Object.keys(prev.data[chain]).map((type: string) => {
        if (type == "total") return;
        const breakdown = prev.data[chain][type].breakdown;
        if (!curr.data[chain] || !curr.data[chain][type] || !curr.data[chain][type].breakdown) {
          console.log(`T: ${curr.timestamp} \tC: ${chain} \tK: ${type} MISSING BREAKDOWN`);
          return;
        }
        Object.keys(breakdown).map((ticker: string) => {
          const prevBal = breakdown[ticker];
          const currBreakdown = curr.data[chain][type].breakdown;
          let currBal;
          try {
            currBal = currBreakdown[ticker] ?? currBreakdown[ticker.toLowerCase()];
          } catch {
            if (prevBal < total * 0.02) return;
            console.log(
              `T: ${curr.timestamp} \tC: ${chain} \tK: ${type} \tA: ${ticker} \tPr: ${Number(
                breakdown[ticker]
              ).toFixed()} \tCu: undefined`
            );
            return;
          }
          if (!currBal) {
            if (prevBal < total * 0.02) return;
            console.log(
              `T: ${curr.timestamp} \tC: ${chain} \tK: ${type} \tA: ${ticker} \tPr: ${Number(
                breakdown[ticker]
              ).toFixed()} \tCu: undefined`
            );
            return;
          }
          if (isNaN(currBal)) {
            cache.push({
              chain,
              type,
              ticker,
              timestamp: curr.timestamp,
            });
            // console.log(`T: ${curr.timestamp} \tC: ${chain} \tK: ${type} \tA: ${ticker} \tCr: isNAN`);
            return;
          }
          if (isNaN(prevBal)) {
            // console.log(`T: ${curr.timestamp} \tC: ${chain} \tK: ${type} \tA: ${ticker} \tPr: isNAN`);
            return;
          }
          const change = prevBal == 0 ? currBal : Math.abs(currBal - prevBal) / prevBal;
          if (change < 0.5) return;
          if (currBal < total * 0.02) return;
          if (prevBal < total * 0.02) return;
          console.log(
            `T: ${curr.timestamp} \tC: ${chain} \tK: ${type} \tA: ${ticker} \tPr: ${Number(
              prevBal
            ).toFixed()} \tCu: ${Number(currBal).toFixed()}`
          );
        });
      });
    });
  });
  return;
}
main();
