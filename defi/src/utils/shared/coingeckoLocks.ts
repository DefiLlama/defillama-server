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
// Rate limit is 500 calls/min for coingecko's API
// So we'll release one every 0.2 seconds to match it
export function setTimer(timeBetweenTicks: number = 200) {
  const timer = setInterval(() => {
    releaseCoingeckoLock();
  }, timeBetweenTicks);
  return timer;
}
