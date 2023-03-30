import sleep from './sleep'

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

export async function retryCoingeckoRequest(
  query: string,
  retries: number,
): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await coingeckoRequest(query);
    } catch (e) {
      if ((i + 1) % 3 === 0 && retries > 3) {
        await sleep(10e3); // 10s
      }
      continue;
    }
  }
  return {};
}

export async function coingeckoRequest(query: string): Promise<any> {
  await getCoingeckoLock();
  try {
    return await fetch(`https://api.coingecko.com/api/v3/${query}`).then((r) =>
      r.json(),
    );
  } catch {
    return await fetch(
      `https://pro-api.coingecko.com/api/v3/${query}?&x_cg_pro_api_key=${process.env.CG_KEY}`,
    ).then((r) => r.json());
  }
}