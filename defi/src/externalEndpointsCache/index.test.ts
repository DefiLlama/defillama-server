jest.mock("../adaptors/utils/storeR2Response", () => ({
  cacheResponseOnR2: jest.fn(),
  getCachedResponseOnR2: jest.fn(),
}));

jest.mock("../utils/shared/invokeLambda", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("node-fetch", () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { getCachedResponseOnR2 } from "../adaptors/utils/storeR2Response";
import invokeLambda from "../utils/shared/invokeLambda";
import { handler } from "./index";

const mockedGetCachedResponseOnR2 = getCachedResponseOnR2 as jest.MockedFunction<typeof getCachedResponseOnR2>;
const mockedInvokeLambda = invokeLambda as jest.MockedFunction<typeof invokeLambda>;

const allowedUrl = "https://api.coingecko.com/api/v3/exchanges?per_page=250";
const cachedKey = "cgcache_https_api_coingecko_com_api_v3_exchanges_per_page_250";
const now = new Date("2026-04-28T00:00:00.000Z").getTime();

function eventForUrl(url: string = allowedUrl) {
  return {
    queryStringParameters: {
      url: encodeURIComponent(url),
    },
  } as any;
}

describe("external endpoints cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("cache miss invokes the worker with the decoded url and returns accepted", async () => {
    mockedGetCachedResponseOnR2.mockResolvedValue(undefined);

    const response = await handler(eventForUrl());

    expect(mockedGetCachedResponseOnR2).toHaveBeenCalledWith(cachedKey);
    expect(mockedInvokeLambda).toHaveBeenCalledWith("defillama-prod-cacheExternalResponse", { url: allowedUrl });
    expect(response.statusCode).toBe(202);
    expect(response.body).toBe(
      "Request accepted, your response is being generated. Please try again this request in some minutes"
    );
  });

  test("stale cache invokes the worker with the decoded url and returns cached body", async () => {
    const body = [{ id: "binance", name: "Binance" }];
    mockedGetCachedResponseOnR2.mockResolvedValue({
      body,
      lastModified: new Date(now - 1000 * 60 * 61),
    });

    const response = await handler(eventForUrl());

    expect(mockedInvokeLambda).toHaveBeenCalledWith("defillama-prod-cacheExternalResponse", { url: allowedUrl });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(body);
  });

  test("fresh cache returns cached body without invoking the worker", async () => {
    const body = { bitcoin: { usd: 100000 } };
    mockedGetCachedResponseOnR2.mockResolvedValue({
      body,
      lastModified: new Date(now - 1000 * 60 * 30),
    });

    const response = await handler(
      eventForUrl("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
    );

    expect(mockedInvokeLambda).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(body);
  });
});
