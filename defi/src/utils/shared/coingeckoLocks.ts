const locks = [] as ((value: unknown) => void)[];
export function getCoingeckoLock() {
  return new Promise((resolve) => {
    locks.push(resolve);
  });
}
export function releaseCoingeckoLock() {
  const firstLock = locks.shift();
  if (firstLock !== undefined) {
    firstLock(null);
  }
}
// Rate limit is 100 calls/min for coingecko's API
// So we'll release one every 0.6 seconds to match it
// 29/03/23 CG docs now say 10-30 calls/min and we're having issues
// Increasing timeBetweenTicks from 1500 to 3000 to see if it helps (20 calls a min)
export function setTimer(timeBetweenTicks: number = 3000) {
  const timer = setInterval(() => {
    releaseCoingeckoLock();
  }, timeBetweenTicks);
  return timer;
}
