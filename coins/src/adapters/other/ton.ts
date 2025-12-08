import fetch from "node-fetch";
import getWrites from "../utils/getWrites";

type Config = {
  rate: () => Promise<number>;
  address: string;
  underlying?: string;
  decimals: number;
};

async function call({ target, abi, rawStack = false }: any) {
  const { status_code, json } = await fetch(`https://api.tonscan.com/api/bt/runGetMethod/${target}/${abi}`, {
    method: "POST",
  }).then((r) => r.json());

  if (status_code != 200) {
    throw new Error("Unknown");
  }
  const { exit_code, raw } = json.data;
  if (exit_code !== 0) {
    throw new Error("Expected a zero exit code, but got " + exit_code);
  }

  if (rawStack) return raw;

  const decoded: any[] = [];
  raw.forEach((i: any, idx: number) => {
    if (i[0] === "num") {
      decoded[idx] = parseInt(i[1], 16);
    }
  });

  return decoded;
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
    address: "EQCup4xxCulCcNwmOocM9HtDYPU8xe0449tQLp6a-5BLEegW",
    underlying: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    decimals: 9,
  },
  TON_STORM: {
    rate: async () => {
      const res = await call({
        target: "EQDpJnZP89Jyxz3euDaXXFUhwCWtaOeRmiUJTi3jGYgF8fnj",
        abi: "get_vault_data",
      });
      return res[1] / 10 ** 9;
    },
    address: "EQCNY2AQ3ZDYwJAqx_nzl9i9Xhd_Ex7izKJM6JTxXRnO6n1F",
    underlying: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
    decimals: 9,
  },
  TLP_TON: {
    rate: async () => {
      const res = await call({
        target: "EQANNroxzBXXdt1Sm5kIcnNZcrDEzux3dB-e0zROSOGQhPdm",
        abi: "tlpPrice",
      });
      return res[0] / 10 ** 18;
    },
    address: "EQDYELRHe6sNcHEKX53qWdXG37OK9VEdDWSX1NcubtcYS2KH",
    underlying: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
    decimals: 9,
  },
};

export async function tonDerivs(timestamp: number) {
  if (timestamp != 0) throw new Error(`TON adapters at current timestamp only`);
  return Promise.all(
    Object.keys(configs).map((k: string) => deriv(k, configs[k])),
  );
}

async function deriv(symbol: string, config: Config) {
  const { rate, underlying, address, decimals } = config;

  return await getWrites({
    chain: "ton",
    timestamp: 0,
    pricesObject: {
      [address]: {
        underlying,
        symbol,
        decimals,
        price: await rate(),
      },
    },
    projectName: symbol,
  });
}