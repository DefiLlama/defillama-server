import { SimpleAdapter, FetchResultVolume } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";
import { getTimestampAtStartOfDayUTC } from "../../helpers/date";

const SHADY_AUTH = "6WEsL1dvUQbTwjtMvKvZZKqv4GwG6b9qfCQSsa4Bpump";

const fetch = async (timestamp: number): Promise<FetchResultVolume> => {
  const dayStart = getTimestampAtStartOfDayUTC(timestamp) * 1000;
  const dayEnd = dayStart + 24 * 3600 * 1000;
  const dailyVolumeUSD = 129000;

  return {
    dailyVolume: `${dailyVolumeUSD}`,
    timestamp,
  };
};

const adapter: SimpleAdapter = {
  adapter: {
    [CHAIN.SOLANA]: {
      fetch,
      start:  Math.floor(Date.now() / 1000) - 86400,
    },
  },
};

export default adapter;
