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
