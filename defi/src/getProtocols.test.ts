import getProtocols, { getPercentChange } from "./getProtocols";
import { getBody } from "./utils/shared/lambda-response";
import storeTvls from "./storeTvlInterval/storeTvls";
jest.mock("./protocols/data");

test("snapshots of responses", async () => {
  await storeTvls([0,1,2,3,4,5]);
  expect(
    await (getProtocols({} as any) as Promise<any>).then((b) =>
      getBody(b).map((a: any) => {
        a.tvl = 1;
        return a;
      })
    )
  ).toMatchInlineSnapshot(`
    Array [
      Object {
        "address": "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
        "audit_note": null,
        "audits": "2",
        "category": "Dexs",
        "chain": "Ethereum",
        "change_1d": 100,
        "change_1h": 100,
        "change_7d": 100,
        "cmcId": "7083",
        "description": "A fully decentralized protocol for automated liquidity provision on Ethereum.
    ",
        "gecko_id": "uniswap",
        "id": "1",
        "logo": null,
        "name": "Uniswap",
        "symbol": "UNI",
        "tvl": 1,
        "url": "https://info.uniswap.org/",
      },
    ]
  `);
});

test("getPercentChange", () => {
  expect(getPercentChange(10, 20)).toBe(100);
  expect(getPercentChange(0, 20)).toBe(100);
  expect(getPercentChange(10, 10)).toBe(0);
  expect(getPercentChange(10, 0)).toBe(-100);
  expect(getPercentChange(10, 5)).toBe(-50);
  expect(getPercentChange(20, 2)).toBe(-90);
  expect(getPercentChange(10, 50)).toBe(400);
});
