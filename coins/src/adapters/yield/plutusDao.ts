import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

export async function plutusDao(timestamp: number) {
  console.log("starting plutusDao");
  const writes: Write[] = [];
  const chain: any = "arbitrum";
  const target: string = "0x5326e71ff593ecc2cf7acae5fe57582d6e74cff1";
  const GLP: string = "0x4277f8f2c384827b5273592ff7cebd9f2c1ac258";
  const params: number = 1e12;
  const api = await getApi(chain, timestamp);
  const rateToAssets =
    (await api.call({
      abi: "function convertToAssets(uint256) view returns (uint256 assets)",
      target,
      params,
    })) / params;
  const pricesObject: any = {
    [target]: { underlying: GLP, price: rateToAssets },
  };

  return getWrites({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "plutus-dao",
  });
}
