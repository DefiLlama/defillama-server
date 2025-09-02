import { getCurrentUnixTimestamp } from "../../../utils/date";
import { CoinData, Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import providers from "@defillama/sdk/build/providers.json";
import { call } from "@defillama/sdk/build/abi/abi2";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { getConfig } from "../../../utils/cache";

const abi: { [fn: string]: Object } = {
  balances: {
    inputs: [{ name: "index", type: "uint256" }],
    name: "balances",
    outputs: [{ internalType: "address", name: "balance", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
};

const portal = "0xAc8f44ceCa92b2a4b30360E5bd3043850a0FFcbE";

const chainIdMap: { [id: number]: string } = {};
Object.keys(providers).map((c: string) => {
  chainIdMap[providers[c as keyof typeof providers].chainId] = c;
});

interface CrossCurveConfigToken {
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
  tags: string[];
  coins?: string[];
  realToken?: CrossCurveConfigToken;
}

interface CrossCurveConfigPool {
  address: string;
  lp: {
    address: string;
  };
  coins: string[];
}

interface CrossCurveConfigChain {
  chainId: number;
  name: string;
  tokens: CrossCurveConfigToken[];
  pools: CrossCurveConfigPool[];
}

type CrossCurveConfig = Record<string, CrossCurveConfigChain>;

export async function crosscurve(timestamp: number = 0) {
  const config = (await getConfig(
    "crosscurve",
    "https://api.crosscurve.fi/networks"
  )) as CrossCurveConfig;

  const writes: Write[] = [];

  const synthPrices: Record<number, Record<string, number>> = {};
  const lpPrices: Record<number, Record<string, number>> = {};

  const synthsData: Record<
    number,
    {
      synths: CrossCurveConfigToken[];
      portalBalances: number[];
      supplies: number[];
      originalPrices: CoinData[];
    }
  > = {};
  const lpsData: Record<
    number,
    {
      lps: CrossCurveConfigToken[];
      supplies: number[];
      balances: number[][];
      prices: CoinData[];
    }
  > = {};

  const allTokens = Object.values(config).flatMap((chain) => chain.tokens);

  await Promise.all(
    Object.values(config).map(async (chainConfig) => {
      const synths = chainConfig.tokens.filter((token) => token.realToken);
      const lps = chainConfig.tokens.filter((token) =>
        token.tags.includes("curve_lp")
      );

      if (!synths.length && !lps.length) {
        return;
      }

      const chainKey = chainIdMap[chainConfig.chainId];
      const targetTimestamp =
        timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
      const api = await getApi(chainKey, targetTimestamp, true);

      if (synths.length) {
        const originals = synths.map((synth) => synth.realToken!);

        const portalBalances = await Promise.all(
          originals.map((orig) =>
            call({
              target: orig.address,
              params: portal,
              chain: chainIdMap[orig.chainId],
              abi: "erc20:balanceOf",
            }).catch((err) => {
              console.log("erc20:balanceOf", err);
              return 0;
            })
          )
        );

        const supplies: number[] = synths.map(() => 0);

        await Promise.all(
          synths.map(async (synth, i) => {
            const allSynths = allTokens.filter(
              (token) =>
                token.realToken &&
                token.realToken.address === synth.realToken!.address
            );

            await Promise.all(
              allSynths.map(async (s) => {
                const supply = await call({
                  target: s.address,
                  chain: chainIdMap[s.chainId],
                  abi: "erc20:totalSupply",
                }).catch((err) => {
                  console.log("erc20:totalSupply", err);
                  return 0;
                });

                supplies[i] += Number(supply);
              })
            );
          })
        );

        const originalPrices = await Promise.all(
          originals
            .filter(
              (orig) => !orig.tags.includes("curve_lp") && !orig.realToken
            )
            .map((orig) =>
              getTokenAndRedirectData(
                [orig.address],
                chainIdMap[orig.chainId],
                targetTimestamp
              )
            )
        );

        synthsData[chainConfig.chainId] = {
          synths,
          portalBalances,
          supplies,
          originalPrices: originalPrices.flat(),
        };
      }

      if (lps.length) {
        const [supplies, balances, prices] = await Promise.all([
          api.multiCall({
            calls: lps.map((lp) => lp.address),
            abi: "erc20:totalSupply",
          }),
          Promise.all(
            lps.map((lp) => {
              const pool = chainConfig.pools.find(
                (pool) =>
                  pool.lp.address.toLowerCase() === lp.address.toLowerCase()
              );

              if (!pool) {
                return [];
              }

              return api.multiCall({
                target: pool.address,
                calls: lp.coins!.map((_, i) => i),
                abi: abi.balances,
              });
            })
          ),
          getTokenAndRedirectData(
            lps.flatMap((lp) => lp.coins!),
            chainIdMap[chainConfig.chainId],
            targetTimestamp
          ),
        ]);

        lpsData[chainConfig.chainId] = {
          lps,
          supplies,
          balances,
          prices,
        };
      }
    })
  );

  const calculateSynthPrices = () => {
    Object.values(config).forEach((chainConfig) => {
      const chainId = chainConfig.chainId;

      if (!synthsData[chainId]) {
        return;
      }

      const { synths, portalBalances, supplies, originalPrices } =
        synthsData[chainId];

      synths.forEach((synth, i) => {
        if (!portalBalances[i] || !supplies[i]) {
          return;
        }

        let originalPrice = originalPrices.find(
          (data) =>
            data.address.toLowerCase() ===
            synth.realToken!.address.toLowerCase()
        )?.price;

        if (!originalPrice) {
          originalPrice =
            lpPrices[synth.realToken!.chainId]?.[
              synth.realToken!.address.toLowerCase()
            ];
        }

        if (!originalPrice) {
          return;
        }

        const portalBalance =
          portalBalances[i] / 10 ** synth.realToken!.decimals;
        const supply = supplies[i] / 10 ** synth.decimals;

        const price = (originalPrice * portalBalance) / supply;

        synthPrices[chainId] ??= {};
        synthPrices[chainId][synth.address.toLowerCase()] = price;
      });
    });
  };

  const calculateLpPrices = () => {
    Object.values(config).forEach((chainConfig) => {
      const chainId = chainConfig.chainId;

      if (!lpsData[chainId]) {
        return;
      }

      const { lps, supplies, balances, prices } = lpsData[chainId];

      lps.forEach((lp, i) => {
        const coins = lp.coins!;

        if (!supplies[i] || balances[i].length !== coins.length) {
          return;
        }

        let tvl = 0;

        for (let j = 0; j < coins.length; j++) {
          const coin = coins[j];
          const balance = balances[i][j];

          let price = prices.find(
            (data) => data.address.toLowerCase() === coin.toLowerCase()
          )?.price;

          if (!price) {
            price = synthPrices[chainId]?.[coin.toLowerCase()];
          }

          if (!price) {
            price = lpPrices[chainId]?.[coin.toLowerCase()];
          }

          if (!price) {
            return;
          }

          tvl += (balance / 10 ** lp.decimals) * price;
        }

        const price = tvl / (supplies[i] / 10 ** lp.decimals);

        lpPrices[chainId] ??= {};
        lpPrices[chainId][lp.address.toLowerCase()] = price;
      });
    });
  };

  calculateSynthPrices();
  calculateLpPrices();
  calculateSynthPrices();
  calculateLpPrices();

  Object.values(config).forEach((chainConfig) => {
    const chainId = chainConfig.chainId;

    if (synthsData[chainId]) {
      synthsData[chainId].synths.forEach((synth) => {
        const price = synthPrices[chainId]?.[synth.address.toLowerCase()];

        if (price) {
          addToDBWritesList(
            writes,
            chainIdMap[chainId],
            synth.address,
            price,
            synth.decimals,
            synth.symbol,
            timestamp,
            "crosscurve",
            1
          );
        } else {
          console.log("Price not found for:", synth.address);
        }
      });
    }

    if (lpsData[chainId]) {
      lpsData[chainId].lps.forEach((lp) => {
        const price = lpPrices[chainId]?.[lp.address.toLowerCase()];

        if (price) {
          addToDBWritesList(
            writes,
            chainIdMap[chainId],
            lp.address,
            price,
            lp.decimals,
            lp.symbol,
            timestamp,
            "crosscurve",
            1
          );
        } else {
          console.log("Price not found for LP:", lp.address);
        }
      });
    }
  });

  console.log(writes, "writes", writes.length);

  return writes;
}
