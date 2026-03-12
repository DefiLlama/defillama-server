import userAdapters from "../dimension_migration/users/list";

test("no id is repeated in user adapters", async () => {
    const ids = [];
    for (const protocol of userAdapters) {
      expect(ids).not.toContain(protocol.id);
      ids.push(protocol.id);
    }
});