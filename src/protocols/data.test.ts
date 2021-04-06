import protocols from "./data";

test("all the dynamic imports work", async () => {
  for (const protocol of protocols) {
    await import(`../../DefiLlama-Adapters/projects/${protocol.module}`);
  }
});

test("no id is repeated", async () => {
  const ids = []
  for (const protocol of protocols) {
    expect(ids).not.toContain(protocol.id)
    ids.push(protocol.id)
  }
});
