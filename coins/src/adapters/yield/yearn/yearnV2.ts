import { multiCall } from "@defillama/sdk/build/abi/index";
import abi from "./abi.json";
import axios from "axios";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { MultiCallResults } from "../../utils/sdkInterfaces";
import { CoinData, Write } from "../../utils/dbInterfaces";
import { requery } from "../../utils/sdk";
import getBlock from "../../utils/block";
const manualVaults: { [chain: string]: string[] } = {
  ethereum: [
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
  ],
  arbitrum: [],
  fantom: []
};
const chains: object = {
  ethereum: 1,
  arbitrum: 42161,
  fantom: 250
};
interface TokenKeys {
  symbol: string;
  address: string;
}
interface VaultKeys {
  symbol: string;
  token: TokenKeys;
  address: string;
  type: string;
}
interface Result {
  address: string;
  price: number;
  decimal: number;
  symbol: string;
}

function resolveDecimals(value: number, i: number) {
  if (value >= 10) i = resolveDecimals(value / 10, i) + 1;
  return i;
}
async function getPricePerShare(
  vaults: VaultKeys[],
  chain: string,
  block: number | undefined
) {
  let pricePerShares: MultiCallResults = await multiCall({
    abi: abi.pricePerShare,
    calls: vaults.map((v: VaultKeys) => ({
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
  pricePerShares: MultiCallResults,
  vaults: VaultKeys[],
  coinsData: CoinData[],
  decimals: any
) {
  const failObject = {
    address: "fail",
    price: -1,
    decimal: -1,
    symbol: "fail"
  };
  let usdValues = pricePerShares.output.map((t) => {
    const selectedVault: VaultKeys | undefined = vaults.find(
      (v: VaultKeys) => v.address.toLowerCase() == t.input.target.toLowerCase()
    );
    if (selectedVault == null) return failObject;
    const underlying = selectedVault.token.address;
    const coinData: CoinData | undefined = coinsData.find(
      (c: CoinData) => c.address == underlying.toLowerCase()
    );
    if (!coinData) return failObject;
    const decimal = decimals.find(
      (c: any) =>
        selectedVault.address.toLowerCase() == c.input.target.toLowerCase()
    ).output;

    if (decimal == null) {
      return failObject;
    }
    const PPSdecimal = resolveDecimals(t.output, 0);
    return {
      address: t.input.target.toLowerCase(),
      price: (t.output * coinData.price) / 10 ** PPSdecimal,
      decimal,
      symbol: selectedVault.symbol
    };
  });

  return usdValues.filter((v) => v.address !== "fail");
}
async function pushMoreVaults(
  chain: string,
  vaults: VaultKeys[],
  block: number | undefined
) {
  if (manualVaults[chain as keyof typeof manualVaults].length == 0)
    return vaults;
  const [
    { output: tokens },
    { output: symbols }
  ]: MultiCallResults[] = await Promise.all([
    multiCall({
      abi: abi.token,
      chain: chain as any,
      calls: manualVaults[chain as keyof typeof manualVaults].map(
        (v: string) => ({
          target: v
        })
      ),
      block
    }),
    multiCall({
      abi: "erc20:symbol",
      chain: chain as any,
      calls: manualVaults[chain as keyof typeof manualVaults].map(
        (v: string) => ({
          target: v
        })
      ),
      block
    })
  ]);

  const vaultInfo: VaultKeys[] = manualVaults[
    chain as keyof typeof manualVaults
  ].map((v: string, i: number) => ({
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
export default async function getTokenPrices(chain: string, timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  let vaults: VaultKeys[] = (
    await axios.get(
      `https://api.yearn.finance/v1/chains/${
        chains[chain as keyof object]
      }/vaults/all`
    )
  ).data;
  // 135
  await pushMoreVaults(chain, vaults, block);

  const coinsData: CoinData[] = await getTokenAndRedirectData(
    vaults.map((v: VaultKeys) => v.token.address.toLowerCase()),
    chain,
    timestamp
  );

  const [pricePerShares] = await Promise.all([
    getPricePerShare(vaults, chain, block)
  ]);

  const decimals = await multiCall({
    chain: chain as any,
    calls: vaults.map((v: VaultKeys) => ({
      target: v.address
    })),
    abi: "erc20:decimals"
  });
  requery(decimals, chain, "erc20:decimals", block);

  const usdValues: Result[] = await getUsdValues(
    pricePerShares,
    vaults,
    coinsData,
    decimals.output
  );

  let writes: Write[] = [];
  usdValues.map((v) => {
    addToDBWritesList(
      writes,
      chain,
      v.address,
      v.price,
      v.decimal,
      v.symbol,
      timestamp,
      "yearnV2",
      0.9
    );
  });
  return writes;
}
