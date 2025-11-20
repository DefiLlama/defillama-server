import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";
import { getTokenInfo } from "../utils/erc20";

const CHAIN = "ethereum";
const CAPYFI_ORACLE_CONTRACT = "0xfbA2712d3bbcf32c6E0178a21955b61FE1FF424A"; 

const ethereumFeeds: { symbol: string; token: string; cToken: string }[] = [
  { 
    symbol: "LAC", 
    token: "0x0Df3a853e4B604fC2ac0881E9Dc92db27fF7f51b", 
    cToken: "0x0568F6cb5A0E84FACa107D02f81ddEB1803f3B50" 
  },
  { 
    symbol: "WARS", 
    token: "0x0DC4F92879B7670e5f4e4e6e3c801D229129D90D", 
    cToken: "0xf80eeec09f417Fa7FCc4A848Ef03af9dF2658d7B"
  },
  { 
    symbol: "RPC", 
    token: "0xEd025A9Fe4b30bcd68460BCA42583090c2266468", 
    cToken: "0xF61159B4a0EE5b1615c9Afb3dA38111043344c32"
  }

];

// World Chain configuration
const WORLD_CHAIN = "wc";
const WC_CAPYFI_ORACLE_CONTRACT = "0x9E60d50407520eD4b6d47906B6c74Bc5D99aD282"; // TODO: Enter World Chain Oracle

const worldChainFeeds: { symbol: string; token: string; cToken: string }[] = [
  { symbol: "WARS", token: "0x0DC4F92879B7670e5f4e4e6e3c801D229129D90D", cToken: "0xF36749472Ad6dA1CcF9eDe8ff321654990635FfA" }, 
  { symbol: "LAC", token: "0x0fe75cae44e409af8c9e631985d6b3de8e1138de", cToken: "0x03c1cF154d621E0Fd7e2b88be3aE60CCf07Aca31" }  
];

const ORACLE_ABI = "function getUnderlyingPrice(address cToken) view returns (uint256)";

export async function capyfi(timestamp: number) {
  const writes: Write[] = [];

  // Ethereum tokens via CapyFi Price Oracle
  if (ethereumFeeds.length) {
    const api = await getApi(CHAIN, timestamp);
    
    const pricesRes = await api.multiCall({
      calls: ethereumFeeds.map((f) => ({ 
        target: CAPYFI_ORACLE_CONTRACT,
        params: [f.cToken]
      })),
      abi: ORACLE_ABI,
      permitFailure: true,
    });

    const tokens = ethereumFeeds.map((f) => f.token);
    const tokenInfo = await getTokenInfo(CHAIN, tokens, undefined);

    pricesRes.forEach((res: any, i: number) => {
      if (!res) return;
      const decimals = tokenInfo.decimals?.[i]?.output ?? 18;
      const symbol = tokenInfo.symbols?.[i]?.output ?? ethereumFeeds[i].symbol;
      
      // Comptroller returns price as mantissa: price * 1e(36 - underlyingDecimals)
      const scale = 36 - decimals;
      const price = Number(res) / Math.pow(10, scale);

      addToDBWritesList(
        writes,
        CHAIN,
        ethereumFeeds[i].token,
        price,
        Number(decimals),
        symbol,
        timestamp,
        "capyfi-oracle",
        0.9,
      );
    });
  }

  // World Chain tokens via provided oracles
  if (worldChainFeeds.length) {
    const wcApi = await getApi(WORLD_CHAIN, timestamp);

    const pricesRes = await wcApi.multiCall({
      calls: worldChainFeeds.map((f) => ({ 
        target: WC_CAPYFI_ORACLE_CONTRACT,
        params: [f.cToken]
      })),
      abi: ORACLE_ABI,
      permitFailure: true,
    });

    const tokens = worldChainFeeds.map((f) => f.token);
    const tokenInfo = await getTokenInfo(WORLD_CHAIN, tokens, undefined);

    pricesRes.forEach((res: any, i: number) => {
      if (!res) return;
      const decimals = tokenInfo.decimals?.[i]?.output ?? 18;
      const symbol = tokenInfo.symbols?.[i]?.output ?? worldChainFeeds[i].symbol;

      const scale = 36 - decimals;
      const price = Number(res) / Math.pow(10, scale);

      addToDBWritesList(
        writes,
        WORLD_CHAIN,
        worldChainFeeds[i].token,
        price,
        Number(decimals),
        symbol,
        timestamp,
        "capyfi-oracle",
        0.9,
      );
    });
  }

  return writes;
}