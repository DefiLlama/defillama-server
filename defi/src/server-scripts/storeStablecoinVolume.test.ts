import {
  collectHistoricalVolumes,
  detectSpikesFromTotals,
  isTokenBlacklisted,
  median,
  type VolumeCache,
} from "./storeStablecoinVolume";

describe("storeStablecoinVolume spike helpers", () => {
  describe("median", () => {
    it("returns 0 for empty list", () => {
      expect(median([])).toBe(0);
    });

    it("returns middle value for odd length", () => {
      expect(median([3, 1, 2])).toBe(2);
    });

    it("returns mean of middle two for even length", () => {
      expect(median([10, 1, 2, 3])).toBe((2 + 3) / 2);
    });
  });

  describe("isTokenBlacklisted", () => {
    it("returns true for all-days blacklist entries", () => {
      const ts = Math.floor(new Date("2026-01-01T00:00:00Z").getTime() / 1000);
      expect(isTokenBlacklisted("DUSD", ts)).toBe(true);
    });

    it("returns true for specific-date blacklist entries", () => {
      const ts = Math.floor(new Date("2022-08-14T12:00:00Z").getTime() / 1000);
      expect(isTokenBlacklisted("USDZ", ts)).toBe(true);
    });

    it("returns false for non-blacklisted tokens", () => {
      const ts = Math.floor(new Date("2022-08-14T12:00:00Z").getTime() / 1000);
      expect(isTokenBlacklisted("USDC", ts)).toBe(false);
    });
  });

  describe("collectHistoricalVolumes", () => {
    it("collects only positive finite volumes and excludes current timestamp", () => {
      const t1 = 1_700_000_000;
      const t2 = t1 + 86400;
      const t3 = t2 + 86400;
      const cache: VolumeCache = {
        [String(t1)]: { timestamp: t1, chains: { ethereum: { tokens: { USDC: 10 }, currencies: {} } } },
        [String(t2)]: { timestamp: t2, chains: { ethereum: { tokens: { USDC: 0, USDT: 5 }, currencies: {} } } },
        [String(t3)]: { timestamp: t3, chains: { ethereum: { tokens: { USDC: Number.POSITIVE_INFINITY as any }, currencies: {} } } },
      };

      expect(collectHistoricalVolumes(cache, "ethereum", "USDC", t1)).toEqual([]); // excluded, and others are invalid
      expect(collectHistoricalVolumes(cache, "ethereum", "USDT", t2)).toEqual([]); // excluded
      expect(collectHistoricalVolumes(cache, "ethereum", "USDC", t2)).toEqual([10]); // t1 only
    });
  });

  describe("detectSpikesFromTotals", () => {
    function mkHistory(values: number[], chain = "ethereum", token = "USDC", baseTs = 1_700_000_000): VolumeCache {
      const out: VolumeCache = {};
      values.forEach((v, i) => {
        const ts = baseTs + i * 86400;
        out[String(ts)] = { timestamp: ts, chains: { [chain]: { tokens: { [token]: v }, currencies: {} } } };
      });
      return out;
    }

    it("does not flag when past observations < min", () => {
      const timestamp = 1_700_999_999;
      const history = mkHistory([1, 1, 1, 1, 1]); // 5 obs
      const totals = new Map<string, number>([["ethereum|USDC", 1_000_000_000]]);

      const { spiked, spikes } = detectSpikesFromTotals(totals, history, timestamp, {
        spikeAbsFloor: 1,
        spikeRatio: 2,
        spikeMinObs: 10,
      });

      expect(spiked.size).toBe(0);
      expect(spikes).toEqual([]);
    });

    it("does not flag when total is below abs floor", () => {
      const timestamp = 1_700_999_999;
      const history = mkHistory(new Array(12).fill(1_000));
      const totals = new Map<string, number>([["ethereum|USDC", 999]]);

      const { spiked } = detectSpikesFromTotals(totals, history, timestamp, {
        spikeAbsFloor: 1_000,
        spikeRatio: 2,
        spikeMinObs: 10,
      });

      expect(spiked.size).toBe(0);
    });

    it("flags when total >= abs floor and >= ratio * median", () => {
      const timestamp = 1_700_999_999;
      const history = mkHistory(new Array(12).fill(1_000_000)); // median = 1_000_000
      const totals = new Map<string, number>([["ethereum|USDC", 3_000_000_000]]); // 3000x vs median=1M

      const { spiked, spikes } = detectSpikesFromTotals(totals, history, timestamp, {
        spikeAbsFloor: 200_000_000,
        spikeRatio: 1000,
        spikeMinObs: 10,
      });

      expect(spiked.has("ethereum|USDC")).toBe(true);
      expect(spikes).toHaveLength(1);
      expect(spikes[0]).toMatchObject({
        chain: "ethereum",
        token: "USDC",
        volume: 3_000_000_000,
        median: 1_000_000,
      });
    });

    it("does not flag when median is 0", () => {
      const timestamp = 1_700_999_999;
      const history = mkHistory(new Array(12).fill(0));
      const totals = new Map<string, number>([["ethereum|USDC", 1_000_000_000]]);

      const { spiked } = detectSpikesFromTotals(totals, history, timestamp, {
        spikeAbsFloor: 1,
        spikeRatio: 2,
        spikeMinObs: 10,
      });

      expect(spiked.size).toBe(0);
    });
  });
});

