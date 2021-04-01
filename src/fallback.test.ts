import fallback from "./fallback";

describe("snapshot of error provided", () => {
  it("executes as expected", async () => {
    const response = await fallback({
      headers: {},
    } as any);
    expect(response).toMatchSnapshot();
  });
});
