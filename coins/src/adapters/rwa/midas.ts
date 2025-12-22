import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const DATA_FEED_ABI =
  "function getDataInBase18() external view returns (int256 answer)";
const AGGREGATOR_ABI =
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)";

type Denomination = "USD" | "BTC" | "SOL" | "XRP" | "ETH";

interface TokenConfig {
  name: string;
  token: string;
  oracle?: string;
  denomination?: Denomination;
}

// Base asset price oracles configuration
const BASE_ASSET_ORACLES = {
  BTC: {
    address: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
    chain: "ethereum",
    decimals: 8,
  }, // BTC/USD on Ethereum
  SOL: {
    address: "0x4ffC43a60e009B551865A93d232E33Fce9f01507",
    chain: "ethereum",
    decimals: 8,
  }, // SOL/USD on Ethereum
  XRP: {
    address: "0xb549a837f95a79b83B3DA47fb64aAa9507Ee799C",
    chain: "xrplevm",
    decimals: 18,
  }, // XRP/USD on Xrplevm
  ETH: {
    address: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    chain: "ethereum",
    decimals: 8,
  }, // ETH/USD on Ethereum
} as const;

const contracts: Record<string, TokenConfig[]> = {
  ethereum: [
  //   {
  //     name: "mTBILL",
  //     token: "0xDD629E5241CbC5919847783e6C96B2De4754e438",
  //     oracle: "0xfCEE9754E8C375e145303b7cE7BEca3201734A2B",
  //   },
  //   {
  //     name: "mBASIS",
  //     token: "0x2a8c22E3b10036f3AEF5875d04f8441d4188b656",
  //     oracle: "0x1615cBC603192ae8A9FF20E98dd0e40a405d76e4",
  //   },
  //   {
  //     name: "mBTC",
  //     token: "0x007115416AB6c266329a03B09a8aa39aC2eF7d9d",
  //     oracle: "0x9987BE0c1dc5Cd284a4D766f4B5feB4F3cb3E28e",
  //     denomination: "BTC",
  //   },
  //   {
  //     name: "mEDGE",
  //     token: "0xbB51E2a15A9158EBE2b0Ceb8678511e063AB7a55",
  //     oracle: "0x20cd58F72cF1727a2937eB1816593390cf8d91cB",
  //   },
  //   {
  //     name: "mMEV",
  //     token: "0x030b69280892c888670EDCDCD8B69Fd8026A0BF3",
  //     oracle: "0x9BF00b7CFC00D6A7a2e2C994DB8c8dCa467ee359",
  //   },
  //   {
  //     name: "mRe7YIELD",
  //     token: "0x87C9053C819bB28e0D73d33059E1b3DA80AFb0cf",
  //     oracle: "0x7E8C632ab231479886AF1Bc02B9D646e4634Da93",
  //   },
  //   {
  //     name: "mRe7BTC",
  //     token: "0x9FB442d6B612a6dcD2acC67bb53771eF1D9F661A",
  //     oracle: "0xB5D6483c556Bc6810b55B983315016Fcb374186D",
  //     denomination: "BTC",
  //   },
  //   {
  //     name: "mF-ONE",
  //     token: "0x238a700eD6165261Cf8b2e544ba797BC11e466Ba",
  //     oracle: "0xCF4e49f5e750Af8F2f9Aa1642B68E5839D9c1C00",
  //   },
  //   {
  //     name: "mHYPER",
  //     token: "0x9b5528528656DBC094765E2abB79F293c21191B9",
  //     oracle: "0x92004DCC5359eD67f287F32d12715A37916deCdE",
  //   },
  //   {
  //     name: "mAPOLLO",
  //     token: "0x7CF9DEC92ca9FD46f8d86e7798B72624Bc116C05",
  //     oracle: "0x9aEBf5d6F9411BAc355021ddFbe9B2c756BDD358",
  //   },
  //   {
  //     name: "mevBTC",
  //     token: "0xb64C014307622eB15046C66fF71D04258F5963DC",
  //     oracle: "0x56814399caaEDCEE4F58D2e55DA058A81DDE744f",
  //     denomination: "BTC",
  //   },
  //   {
  //     name: "mFARM",
  //     token: "0xA19f6e0dF08a7917F2F8A33Db66D0AF31fF5ECA6",
  //     oracle: "0x9f49B0980B141b539e2A94Ec0864Faf699fF9524",
  //   },
  //   {
  //     name: "msyrupUSD",
  //     token: "0x20226607b4fa64228ABf3072Ce561d6257683464",
  //     oracle: "0x81c097e86842051B1ED4299a9E4d213Cb07f6f42",
  //   },
  //   {
  //     name: "msyrupUSDp",
  //     token: "0x2fE058CcF29f123f9dd2aEC0418AA66a877d8E50",
  //     oracle: "0x7833397dA276d6B588e76466C14c82b2d733Cfb6",
  //   },
  //   {
  //     name: "mWildUSD",
  //     token: "0x605A84861EE603e385b01B9048BEa6A86118DB0a",
  //     oracle: "0xe604a420388Fbf2693F2250db0DC84488EE99aA1",
  //   },
  //   {
  //     name: "mEVUSD",
  //     token: "0x548857309BEfb6Fb6F20a9C5A56c9023D892785B",
  //     oracle: "0x508Fe9556C7919E64406bB4042760d7Bb1F40fC9",
  //   },
    {
      name: "mHyperETH",
      token: "0x5a42864b14C0C8241EF5ab62Dae975b163a2E0C1",
      oracle: "0xbD560c1E87752717C34912D128168BfE26021EA2",
      denomination: "ETH",
    },
  //   {
  //     name: "mHyperBTC",
  //     token: "0xC8495EAFf71D3A563b906295fCF2f685b1783085",
  //     oracle: "0xb75B82b2012138815d1A2c4aB5B8b987da043157",
  //     denomination: "BTC",
  //   },
  ],
  // base: [
  //   {
  //     name: "mTBILL",
  //     token: "0xDD629E5241CbC5919847783e6C96B2De4754e438",
  //     oracle: "0xcbCf1e67F1988e2572a2A620321Aef2ff73369f0",
  //   },
  //   {
  //     name: "mBASIS",
  //     token: "0x1C2757c1FeF1038428b5bEF062495ce94BBe92b2",
  //     oracle: "0xD48D38Ec56CDB44c4281068129038A37F5Df04e5",
  //   },
  // ],
  // sapphire: [
  //   { name: "mTBILL", token: "0xDD629E5241CbC5919847783e6C96B2De4754e438" },
  // ],
  // etlk: [
  //   { name: "mTBILL", token: "0xDD629E5241CbC5919847783e6C96B2De4754e438" },
  //   { name: "mBASIS", token: "0x2247B5A46BB79421a314aB0f0b67fFd11dd37Ee4" },
  //   { name: "mMEV", token: "0x5542F82389b76C23f5848268893234d8A63fd5c8" },
  //   { name: "mRe7YIELD", token: "0x733d504435a49FC8C4e9759e756C2846c92f0160" },
  // ],
  // rsk: [
  //   { name: "mTBILL", token: "0xDD629E5241CbC5919847783e6C96B2De4754e438" },
  //   {
  //     name: "mBTC",
  //     token: "0xEF85254Aa4a8490bcC9C02Ae38513Cae8303FB53",
  //     denomination: "BTC",
  //   },
  // ],
  // plume_mainnet: [
  //   {
  //     name: "mTBILL",
  //     token: "0xE85f2B707Ec5Ae8e07238F99562264f304E30109",
  //     oracle: "0x73a64469E0974371005ca0f60Dfc10405613b411",
  //   },
  //   {
  //     name: "mBASIS",
  //     token: "0x0c78Ca789e826fE339dE61934896F5D170b66d78",
  //     oracle: "0x7588139737f32A6da49b9BB03A0a91a45603b45F",
  //   },
  //   {
  //     name: "mEDGE",
  //     token: "0x69020311836D29BA7d38C1D3578736fD3dED03ED",
  //     oracle: "0xa30e78AF094EFC51434693803fEE1D77f568321E",
  //   },
  //   {
  //     name: "mMEV",
  //     token: "0x7d611dC23267F508DE90724731Dc88CA28Ef7473",
  //     oracle: "0x06fa9188680D8487e2b743b182CCc39654211C84",
  //   },
  // ],
  // katana: [
  //   {
  //     name: "mRe7SOL",
  //     token: "0xC6135d59F8D10c9C035963ce9037B3635170D716",
  //     oracle: "0x001b3731c706fEd93BDA240A5BF848C28ae1cC12",
  //     denomination: "SOL",
  //   },
  // ],
  // xrplevm: [
  //   {
  //     name: "mXRP",
  //     token: "0x06e0B0F1A644Bb9881f675Ef266CeC15a63a3d47",
  //     oracle: "0xed4ff96DAF37a0A44356E81A3cc22908B3f06B40",
  //     denomination: "XRP",
  //   },
  // ],
  // plasma: [
  //   { name: 'mHyper', token: '0xb31BeA5c2a43f942a3800558B1aa25978da75F8a', oracle: '0x2EB410e4cb94E2E9E3cdE3F7b405BE4fCC076Bc9' },
  //   { name: 'mXRP', token: '0xc8739fbBd54C587a2ad43b50CbcC30ae34FE9e34', oracle: '0x3BdE0b7B59769Ec00c44C77090D88feB4516E731', denomination: 'XRP' },
  // ],
  // bsc: [{
  //   name: 'mXRP',
  //   token: "0xc8739fbBd54C587a2ad43b50CbcC30ae34FE9e34",
  //   oracle: "0x583970971EFcEBfcebD3b530E436B8fEEb3D43C7",
  //   denomination: "XRP",
  // }],
  // "0g": [{
  //   name: 'mEDGE',
  //   token: "0xA1027783fC183A150126b094037A5Eb2F5dB30BA",
  //   oracle: "0xcbf46Aa4b5bAe5850038D9dF4661a58e85CEDC7e",
  // }]
};

async function getBaseAssetPrices(
  timestamp: number
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  // Group oracles by chain
  const oraclesByChain: Record<
    string,
    { asset: string; address: string; decimals: number }[]
  > = {};
  Object.entries(BASE_ASSET_ORACLES).forEach(([asset, config]) => {
    if (!oraclesByChain[config.chain]) {
      oraclesByChain[config.chain] = [];
    }
    oraclesByChain[config.chain].push({
      asset,
      address: config.address,
      decimals: config.decimals,
    });
  });

  // Fetch prices from each chain
  for (const [chain, oracles] of Object.entries(oraclesByChain)) {
    const api = await getApi(chain, timestamp);
    const calls = await api.multiCall({
      abi: AGGREGATOR_ABI,
      calls: oracles.map((o) => o.address),
      permitFailure: true,
    });

    oracles.forEach((oracle, i) => {
      if (calls[i]?.answer) {
        prices[oracle.asset] =
          Number(calls[i].answer) / Math.pow(10, oracle.decimals);
      } else {
        console.warn(
          `Failed to fetch base asset price for ${oracle.asset} from oracle ${oracle.address} on ${chain}`
        );
      }
    });
  }

  return prices;
}

async function getTokenPrices(
  chain: string,
  timestamp: number,
  baseAssetPrices: Record<string, number>,
  ethereumPrices: Record<string, number>
): Promise<Write[]> {
  const api = await getApi(chain, timestamp);
  const tokens = contracts[chain] || [];

  const tokensWithOracles = tokens.filter((t) => t.oracle);
  const tokensWithoutOracles = tokens.filter((t) => !t.oracle);

  const prices: Record<string, { price: number }> = {};

  if (tokensWithOracles.length > 0) {
    const oracleResponses = await api.multiCall({
      abi: DATA_FEED_ABI,
      calls: tokensWithOracles.map((t) => t.oracle as string),
      permitFailure: true,
    });

    tokensWithOracles.forEach((token, i) => {
      const rawPrice = oracleResponses[i];
      if (rawPrice !== null && rawPrice !== undefined) {
        let usdPrice = Number(rawPrice) / 1e18;

        // Convert to USD if denominated in another asset
        if (token.denomination && token.denomination !== "USD") {
          const basePrice = baseAssetPrices[token.denomination];
          if (basePrice) {
            usdPrice = usdPrice * basePrice;
          }
        }

        prices[token.token] = { price: usdPrice };

        // Store Ethereum prices for other chains to use as fallback
        if (chain === "ethereum") {
          ethereumPrices[token.name] = usdPrice;
        }
      } else {
        console.warn(
          `Failed to fetch price for ${token.name} (${token.token}) from oracle ${token.oracle} on ${chain}`
        );
      }
    });
  }

  tokensWithoutOracles.forEach((token) => {
    const fallbackPrice = ethereumPrices[token.name];
    if (fallbackPrice !== undefined) {
      prices[token.token] = { price: fallbackPrice };
    }
  });

  return getWrites({
    chain,
    timestamp,
    pricesObject: prices,
    projectName: "midas",
  });
}

export async function midas(timestamp: number = 0): Promise<Write[]> {
  const baseAssetPrices = await getBaseAssetPrices(timestamp);

  const ethereumPrices: Record<string, number> = {};

  const chains = Object.keys(contracts);
  const ethereumIndex = chains.indexOf("ethereum");

  let ethereumWrites: Write[] = [];
  let otherChainWrites: Write[] = [];

  if (ethereumIndex !== -1) {
    ethereumWrites = await getTokenPrices(
      "ethereum",
      timestamp,
      baseAssetPrices,
      ethereumPrices
    );
    chains.splice(ethereumIndex, 1);
  }

  if (chains.length > 0) {
    const results = await Promise.all(
      chains.map((chain) =>
        getTokenPrices(chain, timestamp, baseAssetPrices, ethereumPrices)
      )
    );
    otherChainWrites = results.flat();
  }

  return [...ethereumWrites, ...otherChainWrites];
}
