import axios from "axios";
import pRetry from "p-retry";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const JLP_MINT = "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4";
const JITO_MINT = "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL";
const NATIVE_MINT = "So11111111111111111111111111111111111111112";

export async function sleep(msec: number) {
  await new Promise((resolve) => setTimeout(resolve, msec));
}

export async function getJupiterPrice(id: string, vsToken?: string) {
  if (!vsToken) {
    vsToken = USDC_MINT;
  }
  let url = "https://api.jup.ag/price/v2?ids=" + id + "&vsToken=" + vsToken;
  if (vsToken === USDC_MINT) {
    url = "https://api.jup.ag/price/v2?ids=" + id;
  }

  // eslint-disable-next-line
  const result = await axios.get(url);
  if (result.status === 200) {
    const resultJson = await result.data;
    if (resultJson.data[id]) {
      const price = Number(resultJson.data[id].price);
      return price;
    }
  }
  return 0;
}

export async function getJupiterPriceWithRetry(id: string, vsToken?: string) {
  return await pRetry(() => getJupiterPrice(id, vsToken), {
    retries: 3,
    onFailedAttempt: async (err) => {
      await sleep(500);
    },
  });
}

export async function getBaseTokenUsdcPrices() {
  const solUsdcPrice = await getJupiterPriceWithRetry(NATIVE_MINT);
  const jlpUsdcPrice = await getJupiterPriceWithRetry(JLP_MINT);
  const jtoUsdcPrice = await getJupiterPriceWithRetry(JITO_MINT);

  return {
    SOL: solUsdcPrice ?? 0,
    JLP: jlpUsdcPrice ?? 0,
    JTO: jtoUsdcPrice ?? 0,
    USDC: 1,
  };
}

export const getBaseTokenPrice = (
  symbol: string,
  baseTokenUsdcPrice: number
): number => {
  switch (symbol) {
    case "mSOL":
    case "JitoSOL":
    case "bSOL":
    case "JLP":
    case "INF":
    case "kySOL":
    case "lrtsSOL":
    case "kyJTO":
    case "cSOL":
      return baseTokenUsdcPrice;
    case "cUSDC":
    case "cPYUSD":
      return 1;
    default:
      return 0;
  }
};
