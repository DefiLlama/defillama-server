import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const contracts: {
  [chain: string]: {
    manager: string;
    feed: string;
    underlying: string;
    token: string;
  };
} = {
  telos: {
    manager: "0xb1F92104E1Ad5Ed84592666EfB1eB52b946E6e68",
    feed: "0xE421fC686099C4Dec31c9D58B51DE9608665FBF2",
    underlying: "0xd102ce6a4db07d247fcc28f366a623df0938ca9e",
    token: "0x8f7D64ea96D729EF24a0F30b4526D47b80d877B9",
  },
};

const abi: { [name: string]: any } = {
  getRedemptionRate: {
    name: "getRedemptionRate",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  fetchPrice: {
    name: "fetchPrice",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
};

async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  const { manager, feed, underlying, token } = contracts[chain];

  let [rate, oracle] = await Promise.all([
    api.call({
      target: manager,
      abi: abi.getRedemptionRate,
    }),
    api.call({
      target: feed,
      abi: abi.fetchPrice,
    }),
  ]);

  const underlyingPrice = oracle / 1e18;
  const fee = rate / 1e18;
  const price = (1 - fee) / underlyingPrice;

  return getWrites({
    chain,
    timestamp,
    pricesObject: {
      [token]: {
        price,
        underlying,
      },
    },
    projectName: "liquity",
  });
}

export const liquity = async (timestamp: number = 0) =>
  Promise.all(
    Object.keys(contracts).map((chain: string) =>
      getTokenPrice(chain, timestamp),
    ),
  );

getTokenPrice("telos", 0);
// ts-node coins/src/adapters/other/liquity.ts
