import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { storeTvl2 } from "./getAndStoreTvl";
import { Protocol } from "../protocols/data";


// Mock the dependencies
jest.mock("../api2/db", () => ({
    getLatestProtocolItem: jest.fn(),
    getClosestProtocolItem: jest.fn(),
    saveProtocolItem: jest.fn(),
    TABLES: {
        TvlMetricsErrors2: { upsert: jest.fn() },
        TvlMetricsCompleted: { upsert: jest.fn() }
    }
}));

jest.mock("../utils/getLastRecord", () => ({
    hourlyTvl: jest.fn(),
    hourlyTokensTvl: jest.fn(),
    hourlyUsdTokensTvl: jest.fn(),
    hourlyRawTokensTvl: jest.fn(),
    dailyTvl: jest.fn(),
    dailyTokensTvl: jest.fn(),
    dailyUsdTokensTvl: jest.fn(),
    dailyRawTokensTvl: jest.fn(),
}));

jest.mock("../utils/shared/bridgedTvlPostgres", () => ({
    storeAllTokens: jest.fn(() => Promise.resolve(true))
}));

// Mock the elastic logger
jest.mock("@defillama/sdk", () => {
    const originalModule = jest.requireActual("@defillama/sdk");
    return {
        ...originalModule,
        elastic: {
            addErrorLog: jest.fn(),
            writeLog: jest.fn()
        }
    };
});

// Setup a mock module that throws on polygon by default
jest.mock("../utils/imports/importAdapter", () => ({
    importAdapterDynamic: jest.fn(() => Promise.resolve({
        ethereum: {
            tvl: jest.fn(() => Promise.resolve({ "ethereum:0x123": 100 })), // ~100M
        },
        polygon: {
            tvl: jest.fn(() => Promise.reject(new Error("RPC Failed for Polygon"))),
        }
    }))
}));

jest.mock("./computeTVL", () => {
    return jest.fn(() => Promise.resolve({
        usdTvl: 100,
        tokenBalances: { "ethereum:0x123": 100 },
        usdTokenBalances: { "ethereum:0x123": 100 }
    }));
});

jest.mock("./storeNewTvl2", () => {
    return jest.fn(() => Promise.resolve(true));
});

jest.mock("./storeNewTokensValueLocked", () => {
    return jest.fn(() => Promise.resolve(true));
});

describe("TVL Fallback Logic", () => {
    const mockProtocol: Protocol = {
        id: "test-protocol-1",
        name: "TestProtocol",
        module: "test-module",
        chains: ["ethereum", "polygon"],
        logo: null,
        url: "https://test.com",
        description: "Test description",
        audits: "0",
        category: "Dexes",
        twitter: "test",
        gecko_id: "test",
        cmcId: "123",
    };

    const mockUnixTimestamp = 1700000000;

    const baseTvlCall = {
        unixTimestamp: mockUnixTimestamp,
        protocol: mockProtocol,
        useCurrentPrices: false,
        storePreviousData: false,
        fetchCurrentBlockData: false,
        skipBlockData: true,
        breakIfTvlIsZero: false,
        maxRetries: 1,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // explicit reset since clearAllMocks doesn't remove global mockImplementation
        require("../api2/db").getLatestProtocolItem.mockReset();
    });

    it("should fail entirely if no fallback data is available", async () => {
        await expect(storeTvl2(baseTvlCall)).rejects.toThrow("RPC Failed for Polygon");
    });

    it("should use fallback data if a small chain fails and data is fresh (<7 days)", async () => {
        const mockDb = require("../api2/db");
        mockDb.getLatestProtocolItem
            .mockResolvedValueOnce({
                SK: mockUnixTimestamp - 3600, // 1 hour ago
                tvl: 100,
                polygon: 4, // 4% of total — under 5% threshold
            }) // hourlyTvl
            .mockResolvedValueOnce({ polygon: { "polygon:0xabc": 4 } }) // hourlyTokensTvl
            .mockResolvedValueOnce({ polygon: { "polygon:0xabc": 4 } }) // hourlyUsdTokensTvl
            .mockResolvedValueOnce({ polygon: { "polygon:0xabc": "4" } }); // hourlyRawTokensTvl

        const result = await storeTvl2({
            ...baseTvlCall,
            isRunFromUITool: true,
        });

        expect(result).toBeDefined();
        if (result && 'usdTvls' in result) {
            expect(result.usdTvls.tvl).toBe(104);
            expect(result.usdTvls.polygon).toBe(4);
            expect(result.usdTvls.ethereum).toBe(100);
        } else {
            throw new Error("Expected a return object with usdTvls");
        }
    });

    it("should fail if chain is at or above 5% of total TVL", async () => {
        const mockDb = require("../api2/db");
        mockDb.getLatestProtocolItem.mockResolvedValueOnce({
            SK: mockUnixTimestamp - 3600,
            tvl: 100,
            polygon: 5, // exactly 5% → NOT small enough for fallback
        });

        await expect(storeTvl2(baseTvlCall)).rejects.toThrow("RPC Failed for Polygon");
    });

    it("should zero out chain if data is stale (>7 days) and chain is small", async () => {
        const mockDb = require("../api2/db");
        mockDb.getLatestProtocolItem.mockResolvedValueOnce({
            SK: mockUnixTimestamp - 7 * 24 * 3600 - 1, // just over 7 days ago
            tvl: 100,
            polygon: 4, // small chain
        });

        const result = await storeTvl2({
            ...baseTvlCall,
            isRunFromUITool: true,
        });

        expect(result).toBeDefined();
        if (result && 'usdTvls' in result) {
            // polygon should be zeroed out, not cached or failed
            expect(result.usdTvls.polygon).toBe(0);
            expect(result.usdTvls.ethereum).toBe(100);
            expect(result.usdTvls.tvl).toBe(100); // 100 + 0
        } else {
            throw new Error("Expected a return object with usdTvls");
        }
    });

    it("should zero out chain if no cached data exists at all and chain is small", async () => {
        const mockDb = require("../api2/db");
        // Return an object with no SK (no previous data)
        mockDb.getLatestProtocolItem.mockResolvedValueOnce({
            tvl: 100,
            polygon: 1, // small chain, but no SK means isFreshEnough = false
        });

        const result = await storeTvl2({
            ...baseTvlCall,
            isRunFromUITool: true,
        });

        expect(result).toBeDefined();
        if (result && 'usdTvls' in result) {
            expect(result.usdTvls.polygon).toBe(0);
            expect(result.usdTvls.ethereum).toBe(100);
        } else {
            throw new Error("Expected a return object with usdTvls");
        }
    });
});
