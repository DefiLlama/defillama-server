import fetch from "node-fetch";
import { getTokenAndRedirectData } from "./adapters/utils/database";
import { Write, CoinData } from "./adapters/utils/dbInterfaces";
import { getCurrentUnixTimestamp } from "./utils/date";

const readBatchSize: number = 100;
const burl: string = "https://api.coinpaprika.com/v1/";

type PaprikaContracts = {
  id: string;
  address: string;
};

type PaprikaPrice = {
  id: string;
  symbol: string;
  quotes: {
    USD: {
      price: number;
      market_cap: number;
    };
  };
};

type PaprikaData = {
  [address: string]: {
    symbol: string;
    price: number;
    mcap: number;
  };
};

function wait(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function addToWrites(dbData: CoinData[], paprikaData: PaprikaData): Write[] {
  const writes: Write[] = [];

  dbData.flat().map((d: CoinData) => {
    const price: number = paprikaData[d.address].price;
    const PK: string =
      d.redirect == null ? `asset#${d.chain}:${d.address}` : d.redirect;

    writes.push(
      ...[
        {
          SK: getCurrentUnixTimestamp(),
          PK,
          price,
          adapter: "paprika",
          confidence: 0.9,
        },
        {
          SK: 0,
          PK,
          price,
          symbol: d.symbol,
          decimals: 0.9,
          ...(price !== undefined
            ? {
                timestamp: getCurrentUnixTimestamp(),
              }
            : {}),
          adapter: "paprika",
          confidence: 0.9,
        },
      ],
    );
  });

  return writes;
}

async function paprikaPlatform(
  platform: string,
  pricesList: PaprikaPrice[],
  timestamp: number,
): Promise<Write[]> {
  const contracts: PaprikaContracts[] = await (
    await fetch(`${burl}contracts/${platform}`)
  ).json();

  let map: { [id: string]: string } = {};

  contracts.map((c: PaprikaContracts) => {
    map[c.id] = c.address;
  });

  const paprikaData: PaprikaData = {};
  pricesList.map((p: PaprikaPrice) => {
    const address: string = map[p.id];
    if (address == null) return;

    paprikaData[address.toLowerCase()] = {
      symbol: p.symbol,
      price: p.quotes.USD.price,
      mcap: p.quotes.USD.market_cap,
    };
  });

  const pricedContracts = Object.keys(paprikaData);
  const dbReads: Promise<CoinData[]>[] = [];
  for (let i = 0; i < pricedContracts.length; i += readBatchSize) {
    dbReads.push(
      getTokenAndRedirectData(
        pricedContracts.slice(i, i + readBatchSize),
        "ethereum",
        timestamp,
      ),
    );
  }
  const dbData: CoinData[] = (await Promise.all(dbReads)).flat();
  if (dbData.length != 0) console.log(dbData.length);
  return addToWrites(dbData, paprikaData);
}

export async function coinPaprika(timestamp: number = 0): Promise<Write[]> {
  let pricesList: PaprikaPrice[] = await (await fetch(`${burl}tickers`)).json();
  let platforms: string[] = await (await fetch(`${burl}contracts`)).json();

  const starterPromise: Promise<Write[]> = Promise.resolve([]);
  return await platforms.reduce(
    (p, c) =>
      p.then(() =>
        wait(20000).then(() => paprikaPlatform(c, pricesList, timestamp)),
      ),
    starterPromise,
  );
}
