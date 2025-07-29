import { call, multiCall } from "@defillama/sdk/build/abi/index";
import abi from "./abiVaultV3.json";
import abiRegistry from "./abiRegistry.json";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../../utils/database";
import {
  MultiCallResults,
  Result as CallResult,
} from "../../utils/sdkInterfaces";
import { CoinData, Write } from "../../utils/dbInterfaces";
import { requery } from "../../utils/sdk";
import getBlock from "../../utils/block";

const manualVaults: { [chain: string]: string[] } = {
  ethereum: [],
  optimism: [],
  arbitrum: [],
  fantom: [],
  base: [],
  katana: [],
  polygon: [],
};
const registries: {
  [chain: string]: { target: string; fromBlock: number };
} = {
  ethereum: {
    target: "0xd40ecF29e001c76Dcc4cC0D9cd50520CE845B038",
    fromBlock: 21176924,
  },
  arbitrum: {
    target: "0xd40ecF29e001c76Dcc4cC0D9cd50520CE845B038",
    fromBlock: 273947409,
  },
  base: {
    target: "0xd40ecF29e001c76Dcc4cC0D9cd50520CE845B038",
    fromBlock: 22344791,
  },
  katana: {
    target: "0xd40ecF29e001c76Dcc4cC0D9cd50520CE845B038",
    fromBlock: 2852031,
  },
  polygon: {
    target: "0xd40ecF29e001c76Dcc4cC0D9cd50520CE845B038",
    fromBlock: 64224620,
  },
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
  block: number | undefined,
) {
  let pricePerShares: MultiCallResults = await multiCall({
    abi: abi.pricePerShare,
    calls: vaults.map((v: VaultKeys) => ({
      target: v.address,
    })),
    chain: chain as any,
    block,
    permitFailure: true,
  });
  pricePerShares.output = pricePerShares.output.filter(
    (v) => v.success == true,
  );
  return pricePerShares;
}
async function getUsdValues(
  pricePerShares: MultiCallResults,
  vaults: VaultKeys[],
  coinsData: { [key: string]: CoinData },
  decimals: any,
) {
  const failObject = {
    address: "fail",
    price: -1,
    decimal: -1,
    symbol: "fail",
  };
  let usdValues = pricePerShares.output.map((t) => {
    const selectedVault: VaultKeys | undefined = vaults.find(
      (v: VaultKeys) => v.address.toLowerCase() == t.input.target.toLowerCase(),
    );
    if (selectedVault == null) return failObject;
    const underlying = selectedVault.token.address;
    const coinData: CoinData | undefined = coinsData[underlying.toLowerCase()];
    if (!coinData) return failObject;
    const decimal = decimals.find(
      (c: any) =>
        selectedVault.address.toLowerCase() == c.input.target.toLowerCase(),
    ).output;

    if (decimal == null) {
      return failObject;
    }
    const PPSdecimal = resolveDecimals(t.output, 0);
    return {
      address: t.input.target.toLowerCase(),
      price: (t.output * coinData.price) / 10 ** PPSdecimal,
      decimal,
      symbol: selectedVault.symbol,
    };
  });

  return usdValues.filter((v) => v.address !== "fail");
}

/**
 * Fetches all endorsed vaults from the registry using getAllEndorsedVaults function
 * @param chain - The blockchain network
 * @param block - The block number (optional)
 * @returns Array of vault addresses and their metadata
 */
export async function fetchAllEndorsedVaults(
  chain: string,
  block: number | undefined,
): Promise<VaultKeys[]> {
  const { target } = registries[chain];

  // Call getAllEndorsedVaults to get all vault addresses
  const allEndorsedVaults = await call({
    abi: abiRegistry.getAllEndorsedVaults,
    target,
    chain: chain as any,
    block,
  });

  // Flatten the 2D array to get all vault addresses
  const vaultAddresses: string[] = allEndorsedVaults.output.flat();

  // Add manual vaults if any
  vaultAddresses.push(...manualVaults[chain as keyof typeof manualVaults]);

  // Get token addresses and symbols for all vaults
  let [{ output: tokens }, { output: symbols }]: MultiCallResults[] =
    await Promise.all([
      multiCall({
        abi: abi.asset,
        chain: chain as any,
        calls: vaultAddresses.map((v: string) => ({
          target: v,
        })),
        block,
        permitFailure: true,
      }),
      multiCall({
        abi: abi.symbol,
        chain: chain as any,
        calls: vaultAddresses.map((v: string) => ({
          target: v,
        })),
        block,
        permitFailure: true,
      }),
    ]);

  // Retry failed asset calls
  await Promise.all(
    tokens.map(async (t: CallResult, i: number) => {
      if (t.success == true) return;
      try {
        tokens[i] = await call({
          abi: abi.asset,
          target: t.input.target,
          chain,
          block,
        });
      } catch (error) {
        console.error(`Failed to get asset for vault ${t.input.target}:`, error);
      }
    }),
  );

  // Build vault info array
  const vaultInfo: VaultKeys[] = vaultAddresses
    .map((v: string, i: number) => ({
      address: v,
      token: {
        address: tokens[i]?.output || "",
        symbol: "NA",
      },
      symbol: symbols[i]?.output || "Unknown",
      type: "endorsed",
    }))
    .filter((vault) => vault.token.address !== ""); // Filter out vaults with failed asset calls

  return vaultInfo;
}

async function pushMoreVaults(
  chain: string,
  vaults: string[],
  block: number | undefined,
) {
  vaults.push(...manualVaults[chain as keyof typeof manualVaults]);

  let [{ output: tokens }, { output: symbols }]: MultiCallResults[] =
    await Promise.all([
      multiCall({
        abi: abi.asset,
        chain: chain as any,
        calls: vaults.map((v: string) => ({
          target: v,
        })),
        block,
        permitFailure: true,
      }),
      multiCall({
        abi: abi.symbol,
        chain: chain as any,
        calls: vaults.map((v: string) => ({
          target: v,
        })),
        block,
      }),
    ]);

  await Promise.all(
    tokens.map(async (t: CallResult, i: number) => {
      if (t.success == true) return;
      tokens[i] = await call({
        abi: abi.asset,
        target: t.input.target,
        chain,
        block,
      });
    }),
  );

  const vaultInfo: VaultKeys[] = vaults.map((v: string, i: number) => ({
    address: v,
    token: {
      address: tokens[i].output,
      symbol: "NA",
    },
    symbol: symbols[i].output,
    type: "manually added",
  }));
  return vaultInfo;
}

export default async function getTokenPricesV3(chain: string, timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);

  // Use the new fetchAllEndorsedVaults function instead of event scanning
  const vaults = await fetchAllEndorsedVaults(chain, block);

  const coinsData = await getTokenAndRedirectDataMap(
    vaults.map((v: VaultKeys) => v.token.address.toLowerCase()),
    chain,
    timestamp,
  );

  const [pricePerShares] = await Promise.all([
    getPricePerShare(vaults, chain, block),
  ]);

  const decimals = await multiCall({
    chain: chain as any,
    calls: vaults.map((v: VaultKeys) => ({
      target: v.address,
    })),
    abi: abi.decimals,
    permitFailure: true,
  });
  requery(decimals, chain, "erc20:decimals", block);

  const usdValues: Result[] = await getUsdValues(
    pricePerShares,
    vaults,
    coinsData,
    decimals.output,
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
      "yearnV3",
      0.9,
    );
  });
  return writes;
}
