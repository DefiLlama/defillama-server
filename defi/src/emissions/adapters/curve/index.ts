import adapter from "./curve";
import incentives from "./community";
import { AdapterResult } from "../../types/adapters";

export const earlyUsers = adapter(
  "0x575CCD8e2D300e2377B43478339E364000318E2c",
  "ethereum",
  0,
  "initial_locked_supply",
);
export const employees = adapter(
  "0x679FCB9b33Fc4AE10Ff4f96caeF49c1ae3F8fA67",
  "ethereum",
  26_666_666,
  "initial_locked_supply",
);
export const teamAndInvestors = Promise.all(
  [
    ["0xf7dbc322d72c1788a1e37eee738e2ea9c7fa875e", 14_016_820],
    ["0xd2D43555134dC575BF7279F4bA18809645dB0F1D", 0],
    ["0x2a7d59e327759acd5d11a8fb652bf4072d28ac04", 0],
  ].map((c: any[]) => adapter(c[0], "ethereum", c[1], "initial_locked_supply")),
);
export const community = incentives(
  "0xd533a949740bb3306d119cc777fa900ba034cd52",
  1597266000,
);
export const yearnContributors = Promise.all(
  [
    "0xb1a1ae5c34ceec969e1f7e176fe8a0506ce044d6",
    "0xa8823dc09d486718e8e2eeb9b82de4d5d755f1ef",
    "0x102af6aa34c17b9377447ab91e73acbeb76b8501",
    "0xf4efdc3416bdcf258c157e95b8b3ef800c5c93f9",
    "0xc7dc2a6d94a3bdf809e86b20c2872e64d8eb408a",
    "0x908fe98f12e231f646dd8e0889fcd76e6bd0e56c",
    "0x9beff9095d9de093dba704f0eb78fbf0fe53a29a",
    "0x68c97d275f2e73e7059ffc191c16f660b88f6370",
    "0x42a28addc15e627d19e780c89043b4b1d3629d34",
    "0x63c61febe1647ed9a66f0b1f801f90dcaf5c7ac3",
    "0xd1002d0f89dfccc662b9b63e3eb0ab2d4c858ed8",
    "0x8c71522fb660f0627fe522bdfad0530bd3588bb2",
    "0xb91148e9b89ffd4d70aaf61e37a0c0fdb7956a11",
    "0x5eaceeea48d5f69f517396f03803b28e42e9de80",
    "0x890a84ab4f739d7d7390ea6b995eb5f959f2e1ab",
    "0xe0a5a6bd150eb8813f40c83511a9f7110c86f588",
    "0xff14a98e8ae247e3db5ff7b6bfe6c01779f0e602",
    "0x363c2a399646ddbe2f0918d1ebfadcf024b268c0",
    "0x4b05f2731b40753daefd7b4bfc3ec725190c3453",
    "0xd3e580e9e15b454c8226c1a40f41c5e4a155d3bc",
    "0xf9e828098539d1740ea88d7be2d125a14e2840e7",
    "0x8651678562811fd1fcda3315dcbf24abfc70a0b4",
    "0xaa18a25d7c169f27346b335495f1be6a13056674",
    "0x0fedf37a51582cb3c4545ff416c6d671d7c5981f",
    "0x9160f5c55f943896a827cf93f16b06b7d78b5473",
    "0xc6a3f12ba5a35aa019a5681d59a3f063bca73c31",
    "0x0acb5b3eeadd78bf6acec49223b89b049013a23b",
    "0x2bba2d2986ff4a987ede14113845b38a9ea748de",
    "0x738d549cbe9832da0d630fb21e292aa8f39b1028",
    "0x00f73226f11f08c5cf8793aad2515e86ae9e7057",
    "0x5dab4cb743cd55383abbf64753df0573d4e010ec",
    "0x771daf7c204fdf355d0f835c6d990add8931dbc9",
    "0x8bc89738bcf37d43b05ad47079332e3ad2b82c4f",
    "0x0e1f845736baf6b8e44432b88191f7f5a3fcd679",
    "0x5dab4cb743cd55383abbf64753df0573d4e010ec",
  ].map((c: string) =>
    adapter(c, "ethereum", 0, "total_locked").then((r: any) => {
      r.cliff = r.amount / 5;
      return r;
    }),
  ),
);
