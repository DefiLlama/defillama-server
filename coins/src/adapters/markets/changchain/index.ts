import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import { addToDBWritesList } from "../../utils/database";

// CTH Token on BSC
const CTH_ADDRESS = "0x8888888809b788CD6e40a2D27e67425D5D0B5d3B";
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // BSC USDT

// PancakeSwap V3 contracts
const PANCAKE_V3_FACTORY = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";
const PANCAKE_V3_QUOTER = "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997";

const CHAIN = "bsc";

// ABI for PancakeSwap V3 Factory
const factoryAbi = {
  getPool: "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)",
};

// ABI for V3 Pool
const poolAbi = {
  slot0: "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)",
  liquidity: "function liquidity() view returns (uint128)",
  token0: "function token0() view returns (address)",
  token1: "function token1() view returns (address)",
};

// ABI for ERC20
const erc20Abi = {
  decimals: "function decimals() view returns (uint8)",
  symbol: "function symbol() view returns (string)",
};

async function getTokenPrices(timestamp: number): Promise<Write[]> {
  const writes: Write[] = [];
  const api = await getApi(CHAIN, timestamp);

  // Fee tiers to check: 0.01%, 0.05%, 0.25%, 1%
  const feeTiers = [100, 500, 2500, 10000];

  try {
    let poolAddress: string | null = null;
    let selectedFee = 0;

    // Find pool with liquidity
    for (const fee of feeTiers) {
      const addr = await api.call({
        abi: factoryAbi.getPool,
        target: PANCAKE_V3_FACTORY,
        params: [CTH_ADDRESS, USDT_ADDRESS, fee],
      });

      if (addr && addr !== "0x0000000000000000000000000000000000000000") {
        poolAddress = addr;
        selectedFee = fee;
        break;
      }
    }

    if (!poolAddress) {
      console.log("CTH/USDT pool not found on PancakeSwap V3");
      return writes;
    }

    // Get pool data
    const [slot0, liquidity, token0, cthDecimals] = await Promise.all([
      api.call({
        abi: poolAbi.slot0,
        target: poolAddress,
      }),
      api.call({
        abi: poolAbi.liquidity,
        target: poolAddress,
      }),
      api.call({
        abi: poolAbi.token0,
        target: poolAddress,
      }),
      api.call({
        abi: erc20Abi.decimals,
        target: CTH_ADDRESS,
      }),
    ]);

    const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96);
    const isCTHToken0 = token0.toLowerCase() === CTH_ADDRESS.toLowerCase();

    // Calculate price from sqrtPriceX96
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = BigInt(2) ** BigInt(96);
    const priceRatio = Number(sqrtPriceX96) / Number(Q96);
    let price = priceRatio * priceRatio;

    // Adjust for token order and decimals
    // USDT has 18 decimals on BSC, CTH has 18 decimals
    const cthDecimalsNum = Number(cthDecimals);
    const usdtDecimals = 18;

    if (isCTHToken0) {
      // price = token1/token0 = USDT/CTH
      price = price * (10 ** (cthDecimalsNum - usdtDecimals));
    } else {
      // price = token0/token1 = USDT/CTH, need to invert
      price = (1 / price) * (10 ** (usdtDecimals - cthDecimalsNum));
    }

    // Calculate confidence based on liquidity
    const liquidityNum = Number(liquidity);
    let confidence = 0.5;
    if (liquidityNum > 1e18) confidence = 0.95;
    else if (liquidityNum > 1e17) confidence = 0.9;
    else if (liquidityNum > 1e16) confidence = 0.8;
    else if (liquidityNum > 1e15) confidence = 0.7;

    // Add to database writes
    addToDBWritesList(
      writes,
      CHAIN,
      CTH_ADDRESS,
      price,
      cthDecimalsNum,
      "CTH",
      timestamp,
      "cth-pancakeswap-v3",
      confidence
    );

    console.log(`CTH Price: $${price.toFixed(6)}, Pool: ${poolAddress}, Fee: ${selectedFee/10000}%, Confidence: ${confidence}`);

  } catch (error) {
    console.error("Error fetching CTH price:", error);
  }

  return writes;
}

export function changchain(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}
