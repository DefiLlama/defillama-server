import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

// FUSD and FUSDLP share the same addresses on every supported chain
// (CREATE2 deterministic deployment).
const FUSD = "0x9f6714C302ffe3c3bAFaf2Ccb44201fF64f6371C";
const FUSDLP = "0x3fea1cb36D2C5523c062d0E060EAC253608b4DAf";

// Ethereum is the canonical chain for FUSDLP pricing. Reserves and the
// adjustmentFactor are kept in sync across chains by protocol governance,
// so we read the exchange rate once on Ethereum and mirror it everywhere.
const CANONICAL_CHAIN = "ethereum";
const MIRROR_CHAINS: string[] = ["avax", "sonic", "monad"];

export async function fusd(timestamp: number = 0) {
  const writes: Write[] = [];

  const api = await getApi(CANONICAL_CHAIN, timestamp);
  const rawExchangeRate = await api.call({
    target: FUSDLP,
    abi: "uint256:getExchangeRateWithAdjustment",
  });
  const fusdlpPrice = Number(rawExchangeRate) / 1e18;
  if (!Number.isFinite(fusdlpPrice) || fusdlpPrice <= 0) {
    throw new Error(`Invalid FUSDLP exchange rate: ${String(rawExchangeRate)}`);
  }

  const buildPricesObject = () => ({
    [FUSD]: {
      price: 1,
      symbol: "FUSD",
      decimals: 18,
      confidence: 0.99,
    },
    [FUSDLP]: {
      price: fusdlpPrice,
      symbol: "FUSDLP",
      decimals: 18,
      confidence: 0.99,
    },
  });

  await getWrites({
    chain: CANONICAL_CHAIN,
    timestamp,
    writes,
    pricesObject: buildPricesObject(),
    projectName: "fusd",
  });

  await Promise.all(
    MIRROR_CHAINS.map(async (chain) => {
      try {
        await getWrites({
          chain,
          timestamp,
          writes,
          pricesObject: buildPricesObject(),
          projectName: "fusd",
        });
      } catch (e) {
        console.error(`fusd adapter: failed to write on ${chain}:`, e);
      }
    })
  );

  return writes;
}
