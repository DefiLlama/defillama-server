
import fetch from "node-fetch";
import handler from "./getCoins";

describe("snapshot of error provided", () => {
  it("executes as expected", async () => {
    const body = JSON.stringify({
        "coins": [
            "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            "avax:0x9e295b5b976a184b14ad8cd72413ad846c299660",
            "bsc:0x0cf8e180350253271f4b917ccfb0accc4862f262",
            "solana:3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
            "dogechain:0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a",
            "avax:0xfea7976733f47557860f4483f2147a3e99c76b58",
            "bsc:0x385ff2b2fc61164604c5bdc708ccff611fe9c42d"
        ]
    })
    const response = JSON.parse(((await handler({body} as any)) as any).body)
    expect(response).toEqual(await fetch(`https://coins.llama.fi/prices`, {
        method: "POST",
        body
    }).then(r=>r.json()));
  });
});
