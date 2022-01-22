import { getDexVolumeRecord } from "../../dexVolumes/dexVolumeRecords";

const traderjoeId = 1;
const traderjoe = { module: "traderjoe" };

jest.mock("../../dexVolumes/dexVolumeRecords", () => {
  const originalModule = jest.requireActual(
    "../../dexVolumes/dexVolumeRecords"
  );

  return {
    __esModule: true,
    ...originalModule,
    getDexVolumeRecord: jest.fn(() => traderjoe),
  };
});

test("getDexVolumeRecord", async () => {
  const mockedGetDexVolumeRecord = getDexVolumeRecord(traderjoeId);
  expect(mockedGetDexVolumeRecord).toEqual(traderjoe);
  expect(getDexVolumeRecord).toHaveBeenCalled();
});
