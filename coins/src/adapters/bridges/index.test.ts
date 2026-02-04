import { chainsThatShouldNotBeLowerCased } from "../../utils/shared/constants";
import { bridges } from "./index";

const isLowerCase = (str: string) => expect(str.toLowerCase()).toBe(str);

function checkAddress(address: string, canBeCoingecko: boolean) {
  expect(typeof address).toBe("string");
  if (canBeCoingecko && address.includes("#")) {
    expect(address.startsWith("coingecko#")).toBe(true);
    const cgId = address.split("#")[1];
    if (cgId !== "gatetokenGT") {
      isLowerCase(cgId);
    }
  } else {
    expect(address).toContain(":");
    const [chain, tokenAddress] = address.split(":");
    if (chainsThatShouldNotBeLowerCased.includes(chain)) {
      isLowerCase(chain);
      expect(tokenAddress.toLowerCase()).not.toBe(tokenAddress);
    } else {
      isLowerCase(address);
    }
  }
}

test("bridge exports have the right format", async () => {
  await Promise.all(
    bridges.map(async (bridge) => {
      const tokens = await bridge();
      tokens.map((token) => {
        checkAddress(token.from, false);
        checkAddress(token.to, true);
        if (!("getAllInfo" in token)) {
          expect(typeof token.decimals).toBe("number");
          expect(typeof token.symbol).toBe("string");
        }
      });
    }),
  );
});
