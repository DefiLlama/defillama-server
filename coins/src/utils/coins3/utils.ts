export function normalizeCoinId(coinId: string): string {
  coinId = coinId.toLowerCase();
  const replaceSubStrings = ["asset#", "coingecko#", "coingecko:", "ethereum:"];
  const replaceSubStringLengths = replaceSubStrings.map((str) => str.length);

  for (let i = 0; i < replaceSubStrings.length; i++) {
    const subStr = replaceSubStrings[i];
    const subStrLength = replaceSubStringLengths[i];
    if (coinId.startsWith(subStr)) {
      coinId = coinId.slice(subStrLength);
    }
  }
  coinId = coinId.replace(/\//g, ":");
  if (coinId.length === 75 && coinId.startsWith('starknet:'))
    coinId = coinId.replace('0x0', '0x')
  return coinId;
}
