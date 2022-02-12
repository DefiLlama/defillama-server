import getVolumesFromStart from "./";

import {
  dailyTimestampFrom1641081600To1642291200,
  past25TimestampsFrom1642370400,
} from "../fixtures";

describe("getVolumesFromStart", () => {
  const ecosystem = "ethereum";

  const blocks = {
    "1": 1,
  };
  describe("includes all volumes if first item does not have total volume of 0", () => {
    const fetch = async (timestamp: number) => ({
      timestamp,
      totalVolume: `${timestamp}`,
    });

    it("includes all volumes for a timestamp that doesn't start at beginning of a day", async () => {
      const start = 1640998800; // 1/1/22 1:00
      const end = 1642370400; // 16/1/22 22:00

      const beginningOfStartDay = 1640995200;
      const timestamps = [
        start,
        ...dailyTimestampFrom1641081600To1642291200,
        ...past25TimestampsFrom1642370400,
      ];

      let allVolumesRes = await Promise.all(
        timestamps.map((timestamp) => fetch(timestamp))
      );

      const allVolumes = allVolumesRes.reduce((acc: any, curr) => {
        const { timestamp, totalVolume } = curr;
        acc[timestamp] = {
          totalVolume,
        };
        return acc;
      }, {});

      allVolumes[beginningOfStartDay] = {
        totalVolume: "0",
      };

      const result = await getVolumesFromStart({
        blocks,
        ecosystem,
        fetch,
        start,
        end,
      });

      expect({ allVolumes, startTimestamp: beginningOfStartDay }).toEqual(
        result
      );
    });

    it("includes all volumes for a timestamp that starts at beginning of a day", async () => {
      const start = 1640995200; // 1/1/22
      const end = 1642370400; // 16/1/22 22:00

      const beginningOfPrevDay = 1640908800;
      const timestamps = [
        beginningOfPrevDay,
        start,
        ...dailyTimestampFrom1641081600To1642291200,
        ...past25TimestampsFrom1642370400,
      ];

      let allVolumesRes = await Promise.all(
        timestamps.map((timestamp) => fetch(timestamp))
      );

      const allVolumes = allVolumesRes.reduce((acc: any, curr) => {
        const { timestamp, totalVolume } = curr;
        acc[timestamp] = {
          totalVolume,
        };
        return acc;
      }, {});

      allVolumes[beginningOfPrevDay] = {
        totalVolume: "0",
      };

      const result = await getVolumesFromStart({
        blocks,
        ecosystem,
        fetch,
        start,
        end,
      });

      expect({ allVolumes, startTimestamp: beginningOfPrevDay }).toEqual(
        result
      );
    });

    it("includes buffer volumes for range that has less than 25 timestamps", async () => {
      const start = 1641002400; // 1/1/22 1:00
      const end = 1641006000; // 1/1/22 5:00 6 timestamps

      const prevHour = 1640998800;
      const beginningOfStartDay = 1640995200;
      const timestamps = [beginningOfStartDay, start, end];

      let allVolumesRes = await Promise.all(
        timestamps.map((timestamp) => fetch(timestamp))
      );

      const allVolumes = allVolumesRes.reduce((acc: any, curr) => {
        const { timestamp, totalVolume } = curr;
        acc[timestamp] = {
          totalVolume,
        };
        return acc;
      }, {});

      allVolumes[beginningOfStartDay] = {
        totalVolume: "0",
      };

      allVolumes[prevHour] = {
        totalVolume: "0",
      };

      const result = await getVolumesFromStart({
        blocks,
        ecosystem,
        fetch,
        start,
        end,
      });

      expect({ allVolumes, startTimestamp: beginningOfStartDay }).toEqual(
        result
      );
    });
  });

  describe("start has 0 volume, returns correct volumes", () => {
    it("includes buffer volume for a timestamp that doesn't start at beginning of a day and has volume the start of next", async () => {
      const start = 1640998800; // 1/1/22 1:00
      const end = 1642370400; // 16/1/22 22:00

      const fetch = async (timestamp: number) => {
        if (timestamp === start) {
          return {
            timestamp,
            totalVolume: "0",
          };
        }

        return {
          timestamp,
          totalVolume: `${timestamp}`,
        };
      };

      const beginningOfStartDay = 1640995200;
      const timestamps = [
        start,
        ...dailyTimestampFrom1641081600To1642291200,
        ...past25TimestampsFrom1642370400,
      ];

      let allVolumesRes = await Promise.all(
        timestamps.map((timestamp) => fetch(timestamp))
      );

      const allVolumes = allVolumesRes.reduce((acc: any, curr) => {
        const { timestamp, totalVolume } = curr;
        acc[timestamp] = {
          totalVolume,
        };
        return acc;
      }, {});

      allVolumes[beginningOfStartDay] = {
        totalVolume: "0",
      };

      const result = await getVolumesFromStart({
        blocks,
        ecosystem,
        fetch,
        start,
        end,
      });

      expect({ allVolumes, startTimestamp: beginningOfStartDay }).toEqual(
        result
      );
    });

    it("does not include buffer volume for a timestamp that starts at beginning of a day and next does not have volume", async () => {
      const start = 1640995200; // 1/1/22
      const end = 1642370400; // 16/1/22 22:00

      const fetch = async (timestamp: number) => {
        if (timestamp === start || timestamp === start + 86400) {
          return {
            timestamp,
            totalVolume: "0",
          };
        }

        return {
          timestamp,
          totalVolume: `${timestamp}`,
        };
      };

      const timestamps = [
        start,
        ...dailyTimestampFrom1641081600To1642291200,
        ...past25TimestampsFrom1642370400,
      ];

      let allVolumesRes = await Promise.all(
        timestamps.map((timestamp) => fetch(timestamp))
      );

      const allVolumes = allVolumesRes.reduce((acc: any, curr) => {
        const { timestamp, totalVolume } = curr;
        acc[timestamp] = {
          totalVolume,
        };
        return acc;
      }, {});

      const result = await getVolumesFromStart({
        blocks,
        ecosystem,
        fetch,
        start,
        end,
      });

      expect({ allVolumes, startTimestamp: start }).toEqual(result);
    });

    it("does not include buffer volume for a timestamp that starts at beginning of a day and next has volume", async () => {
      const start = 1640995200; // 1/1/22
      const end = 1642370400; // 16/1/22 22:00

      const fetch = async (timestamp: number) => {
        if (timestamp === start) {
          return {
            timestamp,
            totalVolume: "0",
          };
        }

        return {
          timestamp,
          totalVolume: `${timestamp}`,
        };
      };

      const timestamps = [
        start,
        ...dailyTimestampFrom1641081600To1642291200,
        ...past25TimestampsFrom1642370400,
      ];

      let allVolumesRes = await Promise.all(
        timestamps.map((timestamp) => fetch(timestamp))
      );

      const allVolumes = allVolumesRes.reduce((acc: any, curr) => {
        const { timestamp, totalVolume } = curr;
        acc[timestamp] = {
          totalVolume,
        };
        return acc;
      }, {});

      const result = await getVolumesFromStart({
        blocks,
        ecosystem,
        fetch,
        start,
        end,
      });

      expect({ allVolumes, startTimestamp: start }).toEqual(result);
    });
  });
});
