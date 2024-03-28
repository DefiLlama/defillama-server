import getWrites from "../../utils/getWrites";
import { getApi } from "../../utils/sdk";

const REGISTRY = "0x5b1eFC3057E941439C487E67761F348D19Dd4100";

const REGISTRY_KEYS = {
  "ambit.depositorVault":
    "0x970bffd07196f826592058a2977d8df91d0b38816ca31aaaa6a628eda0328dbe",
  "ambit.depositorVaultToken":
    "0x8e9a5206de4051330868a4fdef94140eaddce6206903c36de600007efb237b8d",
};

const ABI = {
  IAddressRegistry: {
    getAddress: "function getAddress(bytes32 key) view returns (address)",
  },
  IDepositorVault: {
    getExchangeRate: "function getExchangeRate() view returns (uint256)",
  },
};

const USDT = "0x55d398326f99059fF775485246999027B3197955";

export async function ambitFinance(timestamp: number) {
  console.log("starting ambit finance", timestamp);
  const chain = "bsc";

  const api = await getApi(chain, timestamp, true);

  const addresses = [
    await api.call({
      abi: ABI["IAddressRegistry"]["getAddress"],
      target: REGISTRY,
      params: [REGISTRY_KEYS["ambit.depositorVault"]],
    }),
    await api.call({
      abi: ABI["IAddressRegistry"]["getAddress"],
      target: REGISTRY,
      params: [REGISTRY_KEYS["ambit.depositorVaultToken"]],
    }),
  ];

  const rate = await api.call({
    abi: ABI["IDepositorVault"]["getExchangeRate"],
    target: addresses[0],
  });

  const pricesObject: any = {
    [addresses[1]]: {
      underlying: USDT,
      price: rate / 10 ** 18,
    },
  };

  return getWrites({
    chain,
    timestamp,
    writes: [],
    pricesObject,
    projectName: "AUSD",
  });
}
