import { allKeysAreAdditionalTvl } from "./getProtocolTvl";

describe("allKeysAreAdditionalTvl", () => {
  it("returns false for an empty record", () => {
    expect(allKeysAreAdditionalTvl({})).toBe(false);
  });

  it("returns true when every key is an additional aggregate", () => {
    expect(allKeysAreAdditionalTvl({ doublecounted: {}, liquidstaking: {} })).toBe(true);
    expect(allKeysAreAdditionalTvl({ dcAndLsOverlap: {} })).toBe(true);
    expect(
      allKeysAreAdditionalTvl({ doublecounted: {}, liquidstaking: {}, dcAndLsOverlap: {} })
    ).toBe(true);
  });

  it("returns false when any real chain key is mixed in", () => {
    expect(allKeysAreAdditionalTvl({ Ethereum: {}, doublecounted: {} })).toBe(false);
    expect(allKeysAreAdditionalTvl({ doublecounted: {}, Arbitrum: {} })).toBe(false);
  });

  it("returns false for a single real chain key (regression case for the previous bug)", () => {
    expect(allKeysAreAdditionalTvl({ Ethereum: {} })).toBe(false);
  });
});
