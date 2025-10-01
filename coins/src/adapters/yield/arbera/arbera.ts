import { ChainApi } from "@defillama/sdk";
import axios from "axios";
import { formatEther } from "ethers";

import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import indexlensAbi from "./indexlens.abi";

const CHAIN_NAME = "berachain";
const CHAIN_ID = 80094; // berachain

const api = new ChainApi({ chain: CHAIN_NAME });

// ERC20 contracts
const THREE_BC = "0x467aA1bFa3dCC714f7c16B3D779200431f6A833B";
const ARBERO = "0xFa7767BBB3d832217ABaa86e5f2654429B3BF29F";
const USDC_E = "0x549943e04f40284185054145c6E4e9568C1D3241";
const BRARBERO = "0x0C1f965EB5221B8Daca960dAc1cCfdA5a97B7Dd7";
const BRLBGT = "0x883899D0111d69f85Fdfd19e4B89E613F231B781";
const STLBGT = "0xFace73a169e2CA2934036C8Af9f464b5De9eF0ca";

const BRARBERO_LP = "0xdC06ec361CF28a610B2f0fC3D25854cF68141610";
const INDEX_LENS = "0x747fc8F8990ed4D3B848C6D7dd1af1Ed50b4B60b";

const DECIMALS = 18;
const CONFIDENCE = 0.9;

const normalizeAddress = (address: string): string => address.toLowerCase();

const isSpecialToken = (address: string): boolean => {
  const normalized = normalizeAddress(address);
  return (
    normalized === normalizeAddress(THREE_BC) ||
    normalized === normalizeAddress(STLBGT)
  );
};

const isArberoToken = (address: string): boolean => {
  const normalized = normalizeAddress(address);
  return (
    normalized === normalizeAddress(ARBERO) ||
    normalized === normalizeAddress(BRARBERO)
  );
};

export const getTokenPrice = async (address: string): Promise<number> => {
  console.log(`Getting token price for ${address}`);

  if (isSpecialToken(address)) {
    const params = new URLSearchParams({
      tokenInAddress: address,
      tokenInChainId: CHAIN_ID.toString(),
      tokenOutAddress: USDC_E,
      tokenOutChainId: CHAIN_ID.toString(),
      amount: (1e18).toString(),
      type: "exactIn",
    });

    try {
      const response = await axios.get(
        `https://backend.kodiak.finance/quote?${params.toString()}`
      );
      return Number(response.data.quoteDecimalsUSD);
    } catch (e) {
      console.error(`Arbera: Error getting price for ${address}`, e);
      return 0;
    }
  }

  if (isArberoToken(address)) {
    // get brLBGT per brarBERO in LP
    const [brarBEROInLP, brLBGTInLP] = await api.multiCall({
      abi: "erc20:balanceOf",
      calls: [
        {
          target: BRARBERO,
          params: BRARBERO_LP,
        },
        {
          target: BRLBGT,
          params: BRARBERO_LP,
        },
      ],
    });

    const brLBGTPerArBERO =
      (BigInt(brLBGTInLP) * BigInt(10) ** BigInt(DECIMALS)) /
      BigInt(brarBEROInLP);

    const brLBGTMutableInfo = await api.call({
      target: INDEX_LENS,
      abi: indexlensAbi.getIndexMutableInfo,
      params: BRLBGT,
    });

    const stLBGTPrice = await getTokenPrice(STLBGT);
    const stLBGTPriceBN = BigInt(stLBGTPrice * 1e18);

    const priceBN =
      (stLBGTPriceBN * BigInt(brLBGTMutableInfo.cbr) * brLBGTPerArBERO) /
      BigInt(10) ** BigInt(DECIMALS * 2);

    const price = Number(formatEther(priceBN));
    return price;
  }

  return 0;
};

function formWrites(
  tokens: { address: string; price: number; symbol: string }[],
  chain: string,
  timestamp: number
): Write[] {
  const writes: Write[] = [];
  tokens.forEach((token) => {
    addToDBWritesList(
      writes,
      chain,
      token.address,
      token.price,
      DECIMALS, // decimals
      token.symbol,
      timestamp,
      "arbera",
      CONFIDENCE // confidence
    );
  });

  return writes;
}

export default async function getArberaTokenPrices(
  chain: string,
  timestamp: number
): Promise<Write[]> {
  const [threeBCPrice, arberoPrice] = await Promise.all([
    getTokenPrice(THREE_BC),
    getTokenPrice(ARBERO),
  ]);
  const tokens: {
    address: string;
    price: number;
    symbol: string;
  }[] = [
    {
      address: THREE_BC,
      price: threeBCPrice,
      symbol: "3BC",
    },
    {
      address: ARBERO,
      price: arberoPrice,
      symbol: "arBERO",
    },
  ];

  return formWrites(tokens, chain, timestamp);
}
