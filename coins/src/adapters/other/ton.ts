import fetch from "node-fetch";
import getWrites from "../utils/getWrites";

type Config = {
  rate: () => Promise<number>;
  address: string;
  underlying?: string;
  underlyingChain?: string;
  decimals: number;
};

async function call({ target, abi, params = [], rawStack = false }: any) {
  const body = JSON.stringify({
    address: target,
    method: abi,
    stack: params,
  });

  const { ok, result } = await fetch("https://ton.drpc.org/rest/runGetMethod", {
    method: "POST",
    body,
  }).then((r) => r.json());

  if (!ok) {
    throw new Error("Unknown");
  }
  const { exit_code, stack } = result;
  if (exit_code !== 0) {
    throw new Error("Expected a zero exit code, but got " + exit_code);
  }

  if (rawStack) return stack;

  stack.forEach((i: any, idx: number) => {
    if (i[0] === "num") {
      stack[idx] = parseInt(i[1], 16);
    }
  });

  return stack;
}

const configs: { [adapter: string]: Config } = {
  USDT_STORM: {
    rate: async () => {
      const res = await call({
        target: "EQAz6ehNfL7_8NI7OVh1Qg46HsuC4kFpK-icfqK9J3Frd6CJ",
        abi: "get_vault_data",
      });
      return res[1] / 10 ** 9;
    },
    underlyingChain: "ethereum",
    address: "EQCup4xxCulCcNwmOocM9HtDYPU8xe0449tQLp6a-5BLEegW",
    underlying: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    decimals: 18,
  },
};

export async function tonDerivs(timestamp: number) {
  if (timestamp != 0) throw new Error(`TON adapters at current timestamp only`);
  return Promise.all(
    Object.keys(configs).map((k: string) => deriv(k, configs[k])),
  );
}

async function deriv(symbol: string, config: Config) {
  const { rate, underlying, address, underlyingChain, decimals } = config;

  return await getWrites({
    underlyingChain,
    chain: "ton",
    timestamp: 0,
    pricesObject: {
      [address]: {
        underlyingChain,
        underlying,
        symbol,
        decimals,
        price: await rate(),
      },
    },
    projectName: symbol,
  });
}
