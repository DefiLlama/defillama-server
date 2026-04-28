import { getTokenExtras, getTokenRightsSymbols } from "./generateToken";

describe("generateToken token rights flags", () => {
  it("marks token-rights rows by token symbol when protocol metadata is missing", () => {
    const tokenRightsSymbols = getTokenRightsSymbols([{ Token: ["BP", "sBP"] }]);

    expect(getTokenExtras({ symbol: "BP", token_nk: "coingecko:backpack" }, new Map(), tokenRightsSymbols)).toEqual({
      tokenRights: true,
    });
  });

  it("does not mark tokens whose symbol is missing from token-rights rows", () => {
    const tokenRightsSymbols = getTokenRightsSymbols([{ Token: ["BP"] }]);

    expect(
      getTokenExtras(
        { symbol: "BPT", token_nk: "coingecko:balancer-pool-token" },
        new Map([["balancer-pool-token", { protocolId: "balancer" }]]),
        tokenRightsSymbols
      )
    ).toEqual({ protocolId: "balancer" });
  });

  it("returns existing tokenRights extras without overwriting", () => {
    const tokenRightsSymbols = getTokenRightsSymbols([{ Token: ["BP"] }]);
    const extras = { tokenRights: true };

    expect(
      getTokenExtras(
        { symbol: "BP", token_nk: "coingecko:backpack" },
        new Map([["backpack", extras]]),
        tokenRightsSymbols
      )
    ).toBe(extras);
  });

  it("merges tokenRights with existing protocol and chain metadata", () => {
    const tokenRightsSymbols = getTokenRightsSymbols([{ Token: ["BP"] }]);

    expect(
      getTokenExtras(
        { symbol: "BP", token_nk: "coingecko:backpack" },
        new Map([["backpack", { protocolId: "4266", chainId: "backpack" }]]),
        tokenRightsSymbols
      )
    ).toEqual({ protocolId: "4266", chainId: "backpack", tokenRights: true });
  });

  it("returns extras when symbol is missing", () => {
    const tokenRightsSymbols = getTokenRightsSymbols([{ Token: ["BP"] }]);

    expect(getTokenExtras({ token_nk: "coingecko:backpack" }, new Map(), tokenRightsSymbols)).toEqual({});
  });
});
