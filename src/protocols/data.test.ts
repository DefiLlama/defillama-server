import protocols from "./data";

test("all the dynamic imports work", async () => {
  for (const protocol of protocols) {
    await import(`../../DefiLlama-Adapters/projects/${protocol.module}`);
  }
});
