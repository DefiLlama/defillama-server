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
});
