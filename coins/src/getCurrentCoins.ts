import { successResponse, wrap, IResponse } from "./utils/shared";
import {
  CoinsResponse,
  batchGetLatest,
  getBasicCoins,
} from "./utils/getCoinsUtils";
import { quantisePeriod } from "./utils/timestampUtils";
import { fetchOkxCurrentPrices } from "./adapters/okx";
import { withTimeout } from "./utils/shared/withTimeout";

const isFresh = (timestamp: number, searchWidth: number) => {
  if (!timestamp) return true;
  const now = Date.now() / 1e3;
  return now - timestamp < searchWidth;
};

const handler = async (event: any): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const searchWidth: number = quantisePeriod(
    event.queryStringParameters?.searchWidth?.toLowerCase() ?? "12h",
  );
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);
  const response = {} as CoinsResponse;
  const coinsWithRedirect = {} as { [redirect: string]: any[] };
  coins.forEach((coin) => {
    if (coin.redirect === undefined) {
      if (isFresh(coin.timestamp, searchWidth)) {
        response[PKTransforms[coin.PK]] = {
          decimals: coin.decimals,
          price: coin.price,
          symbol: coin.symbol,
          timestamp: coin.timestamp,
          confidence: coin.confidence,
        };
      }
    } else {
      coinsWithRedirect[coin.redirect] = [
        ...(coinsWithRedirect[coin.redirect] ?? []),
        coin,
      ];
    }
  });
  const redirects = Object.keys(coinsWithRedirect);
  if (redirects.length > 0) {
    const resolvedRedirectedCoins = await batchGetLatest(redirects);
    resolvedRedirectedCoins.forEach((redirectedCoin) => {
      coinsWithRedirect[redirectedCoin.PK].forEach((ogCoin) => {
        if (isFresh(redirectedCoin.timestamp, searchWidth)) {
          response[PKTransforms[ogCoin.PK]] = {
            decimals: ogCoin.decimals,
            symbol: ogCoin.symbol,
            price: redirectedCoin.price,
            timestamp: redirectedCoin.timestamp,
            confidence: redirectedCoin.confidence,
          };
        }
      });
    });
  }
  try {
    await withTimeout(1500, fetchOkxCurrentPrices(requestedCoins, response));
  } catch (e) {
    console.log(e);
  }

  // Coingecko price refreshes happen each 5 minutes, set expiration at the :00; :05, :10, :15... mark, with 20 seconds extra
  const date = new Date();
  const minutes = date.getMinutes();
  date.setMinutes(minutes + 5 - (minutes % 5));
  date.setSeconds(20);
  return successResponse(
    {
      coins: response,
    },
    undefined,
    {
      Expires: date.toUTCString(),
    },
  );
};

export default wrap(handler);

handler({
  pathParameters: {
    coins:
      "base:0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9,ethereum:0x090185f2135308bad17527004364ebcc2d37e5f6,ethereum:0x4d224452801aced8b2f0aebe155379bb5d594381,ethereum:0x6f80310ca7f2c654691d1383149fa1a57d8ab1f8,coingecko:cheelee,coingecko:injective-protocol,coingecko:sui,ethereum:0xc0c293ce456ff0ed870add98a0828dd4d2903dbf,coingecko:wormhole,base:0x940181a94a35a4569e4529a3cdfb74e38fd98631,ethereum:0x43dfc4159d86f3a37a5a4b3d4580b888ad7d4ddd,coingecko:solana,ethereum:0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0,linea:0xB97F21D1f2508fF5c73E7B5AF02847640B1ff75d,solana:4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R,aptos:0x7fd500c11216f0fe3095d0c4b8aa4d64a4e2e04f83758462f2b127255643615,coingecko:jupiter-exchange-solana,arbitrum:0xd67a097dce9d4474737e6871684ae3c05460f571,arbitrum:0x83d6c8c06ac276465e4c92e7ac8c23740f435140,ethereum:0x5a98fcbea516cf06857215779fd812ca3bef1b32,ethereum:0xc18360217d8f7ab5e7c516566761ea12ce7f9d72,arbitrum:0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a,ethereum:0x4c19596f5aaff459fa38b0f7ed92f11ae6543784,coingecko:echelon-prime,ethereum:0xc55126051b22ebb829d00368f4b12bde432de5da",
  },
  queryStringParameters: {
    searchWidth: "4h",
    apikey: "3feea7c337f383dd96559ea0fbec5cdfb2e94be5",
  },
}); // ts-node src/getCurrentCoins.ts
