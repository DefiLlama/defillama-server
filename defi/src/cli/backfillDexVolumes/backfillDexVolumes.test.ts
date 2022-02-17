import { getDexVolumeMetaRecord } from "../../dexVolumes/dexVolumeRecords";

const traderjoeId = 1;
const traderjoe = { module: "traderjoe" };

jest.mock("../../dexVolumes/dexVolumeRecords", () => {
  const originalModule = jest.requireActual(
    "../../dexVolumes/dexVolumeRecords"
  );

  return {
    __esModule: true,
    ...originalModule,
    getDexVolumeMetaRecord: jest.fn(() => traderjoe),
  };
});

test("getDexVolumeMetaRecord", async () => {
  const mockedgetDexVolumeMetaRecord = getDexVolumeMetaRecord(traderjoeId);
  expect(mockedgetDexVolumeMetaRecord).toEqual(traderjoe);
  expect(getDexVolumeMetaRecord).toHaveBeenCalled();
});
