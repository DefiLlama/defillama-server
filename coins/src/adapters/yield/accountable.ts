import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";
import { fetch } from "../utils";

const API_BASE = "https://yield.accountable.capital/api/loan";

async function getChainIdMap(): Promise<{ [id: number]: string }> {
  try {
    const data: any[] = await fetch("https://api.llama.fi/chains");
    const map: { [id: number]: string } = {};
    data.forEach((chain: any) => {
      if (chain.chainId) map[parseInt(chain.chainId)] = chain.name;
    });
    return map;
  } catch {
    return {};
  }
}

type Loan = {
  loan_address: string;
  chain_id: number;
};

type LoanDetail = {
  on_chain_loan: {
    vault: {
      share: string;
      asset: string;
      symbol: string;
      decimals: number;
    };
    vault_asset: {
      decimals: number;
    };
  };
};

type VaultInfo = {
  token: string;
  asset: string;
  vaultDecimals: number;
  underlyingDecimals: number;
};

async function fetchLoans(): Promise<Loan[]> {
  try {
    const res = await fetch(API_BASE);
    return res.items ?? [];
  } catch {
    return [];
  }
}

async function fetchLoanDetail(address: string): Promise<LoanDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/address/${address}`);
    if (res.error) return null;
    return res;
  } catch {
    return null;
  }
}

export async function accountable(timestamp: number = 0) {
  const [loans, chainIdMap] = await Promise.all([
    fetchLoans(),
    getChainIdMap(),
  ]);

  const BATCH_SIZE = 10;
  const details: { chain_id: number; detail: LoanDetail | null }[] = [];
  for (let i = 0; i < loans.length; i += BATCH_SIZE) {
    const batch = loans.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (loan) => ({
        chain_id: loan.chain_id,
        detail: await fetchLoanDetail(loan.loan_address),
      })),
    );
    details.push(...batchResults);
  }

  const chainVaults: { [chain: string]: VaultInfo[] } = {};

  for (const { chain_id, detail } of details) {
    if (!detail?.on_chain_loan) continue;
    const chain = chainIdMap[chain_id]?.toLowerCase();
    if (!chain) continue;
    const { vault, vault_asset } = detail.on_chain_loan;
    if (!vault?.share || !vault?.asset || !vault_asset) continue;
    if (vault.decimals == null || vault_asset.decimals == null) continue;
    if (!chainVaults[chain]) chainVaults[chain] = [];
    chainVaults[chain].push({
      token: vault.share,
      asset: vault.asset,
      vaultDecimals: vault.decimals,
      underlyingDecimals: vault_asset.decimals,
    });
  }

  return Promise.all(
    Object.keys(chainVaults).map((chain) =>
      getAccountablePrices(chain, timestamp, chainVaults[chain]),
    ),
  );
}

async function getAccountablePrices(
  chain: string,
  timestamp: number,
  vaults: VaultInfo[],
) {
  const api = await getApi(chain, timestamp);

  const converted = await api.multiCall({
    abi: "function convertToAssets(uint256 shares) external view returns (uint256)",
    calls: vaults.map((v) => ({
      target: v.token,
      params: (BigInt(10) ** BigInt(v.vaultDecimals)).toString(),
    })),
  });

  const pricesObject: any = {};
  vaults.forEach((v, i) => {
    if (!converted[i]) return;
    const price = converted[i] / 10 ** v.underlyingDecimals;
    if (isNaN(price) || !isFinite(price)) return;
    pricesObject[v.token] = { underlying: v.asset, price };
  });

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "accountable",
  });
}
