import fetch from "node-fetch";
import { getR2 } from "./utils/r2";

async function main() {
  const r2string = (await getR2(`emissionsIndex`)).body;
  if (!r2string) throw new Error(`found no emissionsIndex in R2`);
  const data = JSON.parse(r2string).data;

  const protocolMap: { [name: string]: any } = {};
  data.map((s: any) => {
    protocolMap[s.name.toLowerCase()] = s;
  });

  const circSupplyMap: { [address: string]: { chain: number; amount: number; project: string } } = {};
  //   circSupplyMap["0x6044153ec87099e838227022572500c50ac41bff"] = {
  //     chain: 1,
  //     amount: protocolMap.forta.circSupply,
  //     project: "forta",
  //   };
  //   circSupplyMap["0xee3593817fb142bfbea560fcf47b3f354f519d33"] = {
  //     chain: 1,
  //     amount: protocolMap.hyphen.circSupply,
  //     project: "hyphen",
  //   };

  data.map((s: any) => {
    if (!s.vesting.address || !s.vesting.chain) return;
    circSupplyMap[s.vesting.address] = { chain: s.vesting.chain, amount: s.circSupply, project: s.name.toLowerCase() };
  });

  const tokenOpsRes: { [address: string]: any } = {};
  await Promise.all(
    Object.keys(circSupplyMap).map((vestingAddress: string) =>
      fetch(
        `https://api.tokenops.xyz/v1/vesting/?chainId=${circSupplyMap[vestingAddress].chain}&contractAddress=${vestingAddress}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TOKENOPS_AUTH}`,
          },
        }
      )
        .then((r) => r.json())
        .then((r) => {
          if (!r || !r.data) return;
          tokenOpsRes[vestingAddress] = r.data[0].totalVested.decimal / 10 ** r.data[0].token.decimals;
        })
    )
  );

  let errorString = ``;
  Object.keys(tokenOpsRes).map((vestingAddress: any) => {
    if (!tokenOpsRes[vestingAddress]) return;

    const tokenOpsSupply = tokenOpsRes[vestingAddress];
    const { amount: emissionsSupply, project } = circSupplyMap[vestingAddress];

    const margin = tokenOpsSupply * 0.05;
    const upperBound = emissionsSupply + margin;
    const lowerBound = emissionsSupply - margin;

    if (tokenOpsSupply < lowerBound || tokenOpsSupply > upperBound) errorString = `${errorString}, ${project}`;
  });

  if (errorString.length) errorString = `${errorString} have erroneous circ supplies compared to tokenOps data.`;

  return;
}
main(); // ts-node defi/src/verifyEmissions.ts
