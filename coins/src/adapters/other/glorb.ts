import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";
import { Write } from "../utils/dbInterfaces";

const projectName = "glorb";

// Uniswap V4 GLORB/WETH pool on Base
const POOL_ID = "0x3dbf9db7ebb1e81fc0f1ddb24ad492acfc778b2ff8eb0d373176a9583b6746cd";
const STATE_VIEW = "0xa3c0c9b65bad0b08107aa264b0f3db444b867a71";
const GLORB = "0xa26303226Baa2299adA8D573a6FcD792aB1CFB07";
const WETH = "0x4200000000000000000000000000000000000006";

// token0 = WETH (lower address), token1 = GLORB
// tick price = token1/token0 = GLORB per WETH
// GLORB price in WETH = 1 / (1.0001^tick * 10^(dec0 - dec1))

const getSlot0Abi = "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint8 protocolFee, uint24 lpFee)";

export async function glorb(timestamp: number = 0) {
  const chain = "base";
  const api = await getApi(chain, timestamp);
  const writes: Write[] = [];
  const pricesObject: any = {};

  const slot0 = await api.call({
    abi: getSlot0Abi,
    target: STATE_VIEW,
    params: [POOL_ID],
  });

  const tick = Number(slot0.tick);
  // Both WETH and GLORB are 18 decimals, so decimal adjustment = 0
  // tick gives price of token1 in token0 terms: GLORB_per_WETH = 1.0001^tick
  // GLORB price in WETH = 1 / (1.0001^tick)
  const glorbPriceInWeth = 1 / Math.pow(1.0001, tick);

  pricesObject[GLORB.toLowerCase()] = {
    underlying: WETH,
    price: glorbPriceInWeth,
  };

  return getWrites({ chain, timestamp, writes, pricesObject, projectName });
}
