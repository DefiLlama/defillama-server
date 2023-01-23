import adapter from "./curve";
import incentives from "./community";

export const earlyUsers = adapter(
  "0x575CCD8e2D300e2377B43478339E364000318E2c",
  "ethereum",
  0,
);
export const employees = adapter(
  "0x679FCB9b33Fc4AE10Ff4f96caeF49c1ae3F8fA67",
  "ethereum",
  26_666_666,
);
export const teamAndInvestors = adapter(
  "0xf7dbc322d72c1788a1e37eee738e2ea9c7fa875e",
  "ethereum",
  14_016_820,
);
export const community = incentives(
  "0xd533a949740bb3306d119cc777fa900ba034cd52",
  1597266000,
);
