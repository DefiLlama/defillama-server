import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import axios from "axios";
import { getTokenInfo } from "../utils/erc20";
import getBlock from "../utils/block";
import { multiCall } from "@defillama/sdk/build/abi";
import {
  readFromPGCache,
  writeToPGCache,
} from "../../../../defi/src/api2/cache/file-cache";
import dayjs from "dayjs";
import { getCurrentUnixTimestamp } from "../../utils/date";

const abi = require("./abi.json");
const now = getCurrentUnixTimestamp();
const margin = 12 * 3600; // 12hrs

async function getForexRates(
  uniqueTickers: string[],
  timestamp: number,
): Promise<{ [string: string]: number }> {
  const date = dayjs(timestamp == 0 ? Date.now() : timestamp * 1000)
    .locale("US")
    .format("YYYY-MM-DD");

  const symbols = [...uniqueTickers, "USD"]
    .reduce((p: string, c: string) => `${p},${c}`, "")
    .substring(1);

  const cachedRates = await readFromPGCache("coins-forexRates");
  let rates: any;
  if (
    cachedRates &&
    "timestamp" in cachedRates &&
    now - cachedRates.timestamp < margin
  ) {
    rates = cachedRates.data;
  } else {
    rates = (
      await axios.get(
        `http://data.fixer.io/api/${date}?access_key=${process.env.FIXER_IO_KEY}&symbols=${symbols}`,
      )
    ).data.rates;
    await writeToPGCache("coins-forexRates", { data: rates, timestamp: now });
  }

  const forexPrices: { [string: string]: number } = {};
  Object.keys(rates).map(
    (r: string) => (forexPrices[r] = rates["USD"] / rates[r]),
  );
  return forexPrices;
}
const tokens = {
  optimism: {
    EUR: "0xdedb0b04aff1525bb4b6167f00e61601690c1ff2",
    USD: "0xdfa2d3a0d32f870d87f8a0d7aa6b9cdeb7bc5adb",
    INR: "0x34c2360ffe5d21542f76e991ffd104f281d4b3fb",
  },
  ethereum: {
    AUD: "0xfb020ca7f4e8c4a5bbbe060f59a249c6275d2b69",
    CHF: "0xbb5b03e920cf702de5a3ba9fc1445af4b3919c88",
    EUR: "0xa8e31e3c38add6052a9407298faeb8fd393a6cf9",
    GBP: "0xdc883b9d9ee16f74be08826e68df4c9d9d26e8bd",
    JPY: "0xe1cc2332852b2ac0da59a1f9d3051829f4ef3c1c",
    KRW: "0xdae6c79c46ab3b280ca28259000695529cbd1339",
    //USD: "0x10a5f7d9d65bcc2734763444d4940a31b109275f"
  },
};
async function getProxies(
  chain: string,
  tokens: any,
  block: number | undefined,
) {
  return (
    await multiCall({
      abi: abi.proxy,
      calls: tokens.map((target: string) => ({
        target: target,
      })),
      chain: chain as any,
      block,
    })
  ).output.map((r: any) => r.output);
}
export default async function getTokenPrices(timestamp: number = 0) {
  const writes: Write[] = [];
  const uniqueTickers: string[] = [];
  Object.values(tokens).map((c: any) => {
    Object.keys(c).map((s) => {
      if (!uniqueTickers.includes(s)) uniqueTickers.push(s);
    });
  });

  const forexPrices = await getForexRates(uniqueTickers, timestamp);

  for (let addresses of Object.entries(tokens)) {
    const chain = addresses[0];
    const tickers = Object.keys(addresses[1]);
    const tokens = Object.values(addresses[1]);
    const block = await getBlock(chain, timestamp);

    const [tokenInfos, tokenAddresses] = await Promise.all([
      getTokenInfo(chain, tokens, block),
      getProxies(chain, tokens, block),
    ]);

    tickers.map((t: string, i: number) => {
      if (!Object.keys(forexPrices).includes(t)) {
        return;
      }
      addToDBWritesList(
        writes,
        chain,
        tokenAddresses[i].toLowerCase(),
        forexPrices[t],
        tokenInfos.decimals[i].output,
        tokenInfos.symbols[i].output,
        timestamp,
        "synthetix",
        0.9,
      );
    });
  }

  return writes;
}
