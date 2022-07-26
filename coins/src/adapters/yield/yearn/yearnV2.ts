import { multiCall } from "@defillama/sdk/build/abi/index";
import abi from "./abi.json";
import axios from "axios";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { multiCallResults } from "../../utils/sdkInterfaces";
import { read, write } from "../../utils/dbInterfaces";
import { requery } from "../../utils/sdk";
import getBlock from "../../utils/block";
const manualVaults = [
  "0x04bC0Ab673d88aE9dbC9DA2380cB6B79C4BCa9aE", // yBUSD
  "0xE6354ed5bC4b393a5Aad09f21c46E101e692d447", // yUSDT
  "0x26EA744E5B887E5205727f55dFBE8685e3b21951", // yUSDC
  "0xC2cB1040220768554cf699b0d863A3cd4324ce32", // yDAI
  "0x99d1fa417f94dcd62bfe781a1213c092a47041bc", // ycDAI
  "0x9777d7e2b60bb01759d0e2f8be2095df444cb07e", // ycUSDC
  "0x1be5d71f2da660bfdee8012ddc58d024448a0a59", // ycUSDT
  "0x16de59092dae5ccf4a1e6439d611fd0653f0bd01", // yDAI
  "0xd6ad7a6750a7593e092a9b218d66c0a814a3436e", // yUSDC
  "0x83f798e925bcd4017eb265844fddabb448f1707d", // yUSDT
  "0x73a052500105205d34daf004eab301916da8190f" // yTUSD
];
const chains: object = {
  ethereum: 1,
  arbitrum: 42161,
  fantom: 250
};
interface tokenKeys {
  symbol: string;
  address: string;
}
interface vaultKeys {
  symbol: string;
  token: tokenKeys;
  address: string;
  type: string;
}
interface result {
  address: string;
  price: number;
  decimal: number;
  symbol: string;
}

function resolveDecimals(value: number, i: number) {
  if (value > 10) i = resolveDecimals(value / 10, i) + 1;
  return i;
}
async function getPricePerShare(
  vaults: vaultKeys[],
  chain: string,
  block: number | undefined
) {
  let pricePerShares: multiCallResults = await multiCall({
    abi: abi.pricePerShare,
    calls: vaults.map((v: vaultKeys) => ({
      target: v.address
    })),
    chain: chain as any,
    block
  });
  await requery(pricePerShares, chain, abi.getPricePerFullShare, block);
  await requery(pricePerShares, chain, abi.constantPricePerShare, block);
  pricePerShares.output = pricePerShares.output.filter(
    (v) => v.success == true
  );
  return pricePerShares;
}
async function getUsdValues(
  pricePerShares: multiCallResults,
  vaults: vaultKeys[],
  coinsData: read[]
) {
  let usdValues = pricePerShares.output.map((t) => {
    const selectedVaults = vaults.filter(
      (v: vaultKeys) => v.address.toLowerCase() == t.input.target.toLowerCase()
    );
    const underlying = selectedVaults[0].token.address;
    const coinData: read = coinsData.filter((c: read) =>
      c.dbEntry.PK.includes(underlying.toLowerCase())
    )[0];
    if (!coinData)
      return {
        address: "fail",
        price: -1,
        decimal: -1,
        symbol: "fail"
      };

    const underlyingPrice: number =
      coinData.redirect.length != 0
        ? coinData.redirect[0].price
        : coinData.dbEntry.price;
    const decimal = resolveDecimals(t.output, 0);

    return {
      address: t.input.target.toLowerCase(),
      price: (t.output * underlyingPrice) / 10 ** decimal,
      decimal,
      symbol: selectedVaults[0].symbol
    };
  });

  return usdValues.filter((v) => v.address !== "fail");
}
async function pushMoreVaults(
  chain: string,
  vaults: vaultKeys[],
  block: number | undefined
) {
  const [
    { output: tokens },
    { output: symbols }
  ]: multiCallResults[] = await Promise.all([
    multiCall({
      abi: abi.token,
      chain: chain as any,
      calls: manualVaults.map((v) => ({
        target: v
      })),
      block
    }),
    multiCall({
      abi: "erc20:symbol",
      chain: chain as any,
      calls: manualVaults.map((v) => ({
        target: v
      })),
      block
    })
  ]);

  const vaultInfo: vaultKeys[] = manualVaults.map((v: string, i: number) => ({
    address: v,
    token: {
      address: tokens[i].output,
      symbol: "NA"
    },
    symbol: symbols[i].output,
    type: "manually added"
  }));
  vaults.push(...vaultInfo);
}
export default async function getTokenPrices(
  chain: string,
  timestamp: number = 0
) {
  const block: number | undefined = await getBlock(chain, timestamp);
  let vaults: vaultKeys[] = (
    await axios.get(
      `https://api.yearn.finance/v1/chains/${
        chains[chain as keyof object]
      }/vaults/all`
    )
  ).data;
  // 135
  await pushMoreVaults(chain, vaults, block);

  const coinsData: read[] = await getTokenAndRedirectData(
    vaults.map((v: vaultKeys) => v.token.address.toLowerCase()),
    chain,
    timestamp
  );

  const [pricePerShares] = await Promise.all([
    getPricePerShare(vaults, chain, block)
  ]);

  const usdValues: result[] = await getUsdValues(
    pricePerShares,
    vaults,
    coinsData
  );

  let writes: write[] = [];
  usdValues.map((v) => {
    addToDBWritesList(writes, chain, v.address, v.price, v.decimal, v.symbol);
  });
  return writes;
}
