import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { multiCall } from "@defillama/sdk/build/abi";
import getBlock from "../../utils/block";
import { utils } from "ethers";

/*
 Jarvis network's jFIAT tokens are stablecoins pegged to non-usd fiat. They rely on Chainlink oracles to maintain
 their peg in their own liquidity pools, but there is not enough liquidity on other markets like Uniswap, Balancer, etc.
 
 This makes it's hard to find a correct price for these tokens, because sites like Coingecko require a minimum number of
 dexes and liquidity.
 
 The idea will be to price the tokens based on the Chainlink oracle directly
 
 More on their stability mechanism here: https://learn.jarvis.network/protocol-overview/peg
*/

export const JFIAT: Record<string, { symbol: string, address: string, feed: string }[]> = {
  'polygon': [
    { symbol: 'jAUD', address: '0xCB7F1Ef7246D1497b985f7FC45A1A31F04346133', feed: '0x062Df9C4efd2030e243ffCc398b652e8b8F95C6f' },
    { symbol: 'jCAD', address: '0x8ca194A3b22077359b5732DE53373D4afC11DeE3', feed: '0xACA44ABb8B04D07D883202F99FA5E3c53ed57Fb5' },
    { symbol: 'jCHF', address: '0xbD1463F02f61676d53fd183C2B19282BFF93D099', feed: '0xc76f762CedF0F78a439727861628E0fdfE1e70c2' },
    { symbol: 'jCNY', address: '0x84526c812d8f6c4fd6c1a5b68713aff50733e772', feed: '0x04bB437Aa63E098236FA47365f0268547f6EAB32' },
    { symbol: 'jEUR', address: '0x4e3decbb3645551b8a19f0ea1678079fcb33fb4c', feed: '0x73366Fe0AA0Ded304479862808e02506FE556a98' },
    { symbol: 'jGBP', address: '0x767058F11800FBA6A682E73A6e79ec5eB74Fac8c', feed: '0x099a2540848573e94fb1Ca0Fa420b00acbBc845a' },
    { symbol: 'jJPY', address: '0x8343091F2499FD4b6174A46D067A920a3b851FF9', feed: '0xD647a6fC9BC6402301583C91decC5989d8Bc382D' },
    { symbol: 'jKRW', address: '0xa22f6bc96f13bcc84df36109c973d3c0505a067e', feed: '0x24B820870F726dA9B0D83B0B28a93885061dbF50' },
    { symbol: 'jMXN', address: '0xbd1fe73e1f12bd2bc237de9b626f056f21f86427', feed: '0x171b16562EA3476F5C61d1b8dad031DbA0768545' },
    { symbol: 'jNZD', address: '0x6b526Daf03B4C47AF2bcc5860B12151823Ff70E0', feed: '0xa302a0B8a499fD0f00449df0a490DedE21105955' },
    { symbol: 'jPHP', address: '0x486880FB16408b47f928F472f57beC55AC6089d1', feed: '0x218231089Bebb2A31970c3b77E96eCfb3BA006D1' },
    { symbol: 'jTRY', address: '0x2a227fc77bb2cf8f1881a04ecc8fa01ec57ec9fc', feed: '0xd78325DcA0F90F0FFe53cCeA1B02Bb12E1bf8FdB' },
  ],
}

export default async function getTokenPrices(chain: string, timestamp: number) {
  const tokens = JFIAT[chain] ?? []
  const writes: Write[] = [];
  const feeds = tokens.map(({ feed }) => feed)
  const prices = await getPrices(timestamp, chain, feeds)
  for (let i = 0; i < tokens.length; i++) {
    const { symbol, address } = tokens[i]
    addToDBWritesList(
      writes,
      chain,
      address,
      prices[i],
      18,
      symbol,
      timestamp,
      'jarvis',
      1
    );
  }
  return writes;
}

async function getPrices(
  timestamp: number,
  chain: any,
  feeds: string[]
): Promise<number[]> {
  const block = await getBlock(chain, timestamp)
  const targets = feeds.map((target: string) => ({ target }));
  const { output } = await multiCall({ calls: targets, chain, block, abi: CHAINLINK_FEED_ABI });
  return output.map(({ output }) => output.answer)
    .map((answer) => utils.formatUnits(answer, 8))
    .map((answer) => parseFloat(answer))
}

const CHAINLINK_FEED_ABI = {
  "name": "latestRoundData",
  "outputs": [
    {
      "internalType": "uint80",
      "name": "roundId",
      "type": "uint80"
    },
    {
      "internalType": "int256",
      "name": "answer",
      "type": "int256"
    },
    {
      "internalType": "uint256",
      "name": "startedAt",
      "type": "uint256"
    },
    {
      "internalType": "uint256",
      "name": "updatedAt",
      "type": "uint256"
    },
    {
      "internalType": "uint80",
      "name": "answeredInRound",
      "type": "uint80"
    }
  ],
  "stateMutability": "view",
  "type": "function"
}