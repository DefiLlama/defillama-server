import { findTokenContributions } from './tvlSpikeDetector';

function oldFindTokenContributions(usdTokenSeries: any[], event: any) {
  const sorted = [...usdTokenSeries].sort((a, b) => a.SK - b.SK);

  const beforeRecord = sorted.filter(r => r.SK < event.startTimestamp).pop();
  const duringRecords = sorted.filter(r => r.SK >= event.startTimestamp && r.SK <= event.endTimestamp);
  const afterRecord = sorted.filter(r => r.SK > event.endTimestamp)[0];

  if (!beforeRecord || !duringRecords.length) return [];

  const tokenKeys = new Set<string>();
  const skipKeys = new Set(['SK', 'PK', 'tvl']);

  const getTokens = (record: any) => {
    if (event.level === 'chain' && event.chain) {
      const chainData = record[event.chain];
      if (chainData && typeof chainData === 'object') return chainData;
      return {};
    }
    const result: Record<string, number> = {};
    for (const [key, val] of Object.entries(record)) {
      if (skipKeys.has(key)) continue;
      if (typeof val === 'object' && val !== null) {
        for (const [token, amount] of Object.entries(val as any)) {
          result[token] = (result[token] ?? 0) + (amount as number);
        }
      }
    }
    return result;
  };

  const beforeTokens = getTokens(beforeRecord);

  let peakDuringRecord = duringRecords[0];
  for (const rec of duringRecords) {
    const duringTokens = getTokens(rec);
    const peakTokens = getTokens(peakDuringRecord);
    const duringTotal = Object.values(duringTokens).reduce((s: number, v: any) => s + (v || 0), 0);
    const peakTotal = Object.values(peakTokens).reduce((s: number, v: any) => s + (v || 0), 0);
    if (event.type === 'spike' ? duringTotal > peakTotal : duringTotal < peakTotal) {
      peakDuringRecord = rec;
    }
  }
  const duringTokens = getTokens(peakDuringRecord);
  const afterTokens = afterRecord ? getTokens(afterRecord) : beforeTokens;

  for (const key of Object.keys(beforeTokens)) tokenKeys.add(key);
  for (const key of Object.keys(duringTokens)) tokenKeys.add(key);

  const contributions: any[] = [];

  for (const token of tokenKeys) {
    const valueBefore = beforeTokens[token] ?? 0;
    const valueDuring = duringTokens[token] ?? 0;
    const valueAfter = afterTokens[token] ?? 0;

    const tokenChange = valueDuring - valueBefore;
    const tokenChangePct = valueBefore > 0 ? (tokenChange / valueBefore) * 100 : (valueDuring > 0 ? 100 : 0);

    if (Math.abs(tokenChange) < 1000 && Math.abs(tokenChangePct) < 5) continue;

    contributions.push({
      token,
      valueBefore: Math.round(valueBefore),
      valueDuring: Math.round(valueDuring),
      valueAfter: Math.round(valueAfter),
      changePct: Math.round(tokenChangePct * 100) / 100,
      changeValue: Math.round(tokenChange),
    });
  }

  contributions.sort((a, b) => Math.abs(b.changeValue) - Math.abs(a.changeValue));
  return contributions.slice(0, 10);
}

describe('findTokenContributions', () => {
  const series = [
    { SK: 100, ethereum: { USDC: 10_000, ETH: 20_000 }, arbitrum: { ARB: 5_000 }, tvl: 35_000 },
    { SK: 200, ethereum: { USDC: 12_000, ETH: 20_500 }, arbitrum: { ARB: 5_200 }, tvl: 37_700 },
    { SK: 300, ethereum: { USDC: 25_000, ETH: 19_000 }, arbitrum: { ARB: 8_500 }, tvl: 52_500 },
    { SK: 400, ethereum: { USDC: 15_000, ETH: 18_000 }, arbitrum: { ARB: 4_000 }, tvl: 37_000 },
    { SK: 500, ethereum: { USDC: 14_000, ETH: 18_500 }, arbitrum: { ARB: 3_000 }, tvl: 35_500 },
  ];

  test('matches previous implementation for global spike events', () => {
    const event = { type: 'spike', level: 'global', startTimestamp: 200, endTimestamp: 400 };
    expect(findTokenContributions(series, event as any)).toEqual(oldFindTokenContributions(series, event));
  });

  test('matches previous implementation for chain drop events', () => {
    const event = { type: 'drop', level: 'chain', chain: 'arbitrum', startTimestamp: 300, endTimestamp: 500 };
    expect(findTokenContributions(series, event as any)).toEqual(oldFindTokenContributions(series, event));
  });

  test('matches previous implementation when no before record exists', () => {
    const event = { type: 'spike', level: 'global', startTimestamp: 50, endTimestamp: 100 };
    expect(findTokenContributions(series, event as any)).toEqual(oldFindTokenContributions(series, event));
  });
});
