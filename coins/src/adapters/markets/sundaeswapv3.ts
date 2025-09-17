import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import axios from "axios";
import { Write } from "../utils/dbInterfaces";

const chain = "cardano";

export function sundaeswapV3(timestamp: number) {
  const THIRY_MINUTES = 1800;
  if (+timestamp !== 0 && timestamp < +new Date() / 1e3 - THIRY_MINUTES)
    throw new Error("Can't fetch historical data");

  return Promise.all([getTokenPrices(timestamp)]);
}

const toHex = (str: string): string => Buffer.from(str, "utf8").toString("hex");

async function getPools() {
  const response = await axios.post("https://api.sundae.fi/graphql", {
    query: `query getPopularPools { 
        pools { 
          popular { 
            current {
              quantityA {
                quantity
                asset {
                  id 
                  policyId 
                  decimals 
                  ticker 
                }
              }
              quantityB {
                quantity
                asset {
                  id 
                  policyId 
                  decimals 
                  ticker 
                }
              }
            }
          } 
        } 
      }`,
    operationName: "getPopularPools",
  });

  const topPools = response.data.data?.pools?.popular.map(
    (p: any) => p.current,
  );
  return topPools.filter(
    (i: any) =>
      i.quantityA.asset.ticker === "ADA" && i.quantityB.asset.policyId,
  );
}

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  let pools = await getPools();

  const [basePrice] = await getTokenAndRedirectData(
    ["cardano"],
    "coingecko",
    timestamp,
  );
  const cardanoPrice = basePrice.price;

  pools.forEach(
    ({
      quantityA: { quantity: amountA },
      quantityB: {
        quantity: amountB,
        asset: { decimals, ticker, policyId },
      },
    }: any) => {
      const token = policyId.toLowerCase() + toHex(ticker).toLowerCase();
      const symbol = ticker.replace(/ /g, "-").toUpperCase();
      const price = (amountA * 10 ** (decimals - 6)) / amountB;

      addToDBWritesList(
        writes,
        chain,
        token,
        cardanoPrice * price,
        decimals,
        symbol,
        timestamp,
        "sundaeswap",
        0.9,
      );
    },
  );

  return writes;
}
