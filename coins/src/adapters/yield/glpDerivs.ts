import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

type RateGetter = {
  rateFunction: any;
  target: string;
  protocol: string;
  params?: any[];
  underlying?: string;
};

export async function glpDerivs(timestamp: number) {
  console.log("starting glpDerivs");
  const writes: Write[] = [];
  const chain: any = "arbitrum";
  const GLP: string = "0x4277f8f2c384827b5273592ff7cebd9f2c1ac258";
  const api = await getApi(chain, timestamp);

  const convertToAssets = async (target: string, params: number) =>
    (await api.call({
      abi: "function convertToAssets(uint256) view returns (uint256 assets)",
      target,
      params,
    })) / params;

  const rates: RateGetter[] = [
    {
      // plvGLP
      rateFunction: (target: string, params: number) =>
        convertToAssets(target, params),
      target: "0x5326e71ff593ecc2cf7acae5fe57582d6e74cff1",
      protocol: "plutus-dao",
      params: [1e12],
    },
    {
      //magicGLP
      rateFunction: (target: string, params: number) =>
        convertToAssets(target, params),
      target: "0x85667409a723684Fe1e57Dd1ABDe8D88C2f54214",
      protocol: "abracadabra",
      params: [1e12],
    },
    {
      // dplvGLP
      rateFunction: async () => 1,
      target: "0x5c80ac681b6b0e7ef6e0751211012601e6cfb043",
      protocol: "dolomite",
      underlying: "0x5326e71ff593ecc2cf7acae5fe57582d6e74cff1",
    },
  ];

  await Promise.all(
    rates.map((r: RateGetter) =>
      r.rateFunction(r.target, r.params).then((price: number) =>
        getWrites({
          chain,
          timestamp,
          writes,
          pricesObject: {
            [r.target]: {
              underlying: r.underlying == null ? GLP : r.underlying,
              price,
            },
          },
          projectName: r.protocol,
        }),
      ),
    ),
  );

  return writes;
}
