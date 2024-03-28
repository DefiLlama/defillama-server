import { Token } from "./index";
import axios from "axios";

const chain = 'astrzk'

export default async function bridge(): Promise<Token[]> {
  const { data: bridgeStr } = (
    await axios.get("https://raw.githubusercontent.com/AstarNetwork/astar-apps/1a8db6ea86bb7ff13e8ecedd8d595134ca17341b/src/modules/zk-evm-bridge/tokens.ts")
  )
  const bridge = extractDefaultTokens(bridgeStr) as any[];

  const tokens: Token[] = bridge
    .filter((token) => token.srcChainId === 1 && token.bridgedChainId === 3776)
    .map((token) => {
      return {
        from: `${chain}:${token.bridgedTokenAddress}`,
        to: `ethereum:${token.address}`,
        symbol: token.symbol,
        decimals: token.decimal,
      }
    });

  return tokens
}

// Function to extract DEFAULT_TOKENS value as JSON array
function extractDefaultTokens(content: any) {
  const startTokenIndex = content.indexOf('DEFAULT_TOKENS = ') + 'DEFAULT_TOKENS = '.length;
  const endTokenIndex = content.indexOf('];', startTokenIndex) + 1;

  const defaultTokensStr = content.substring(startTokenIndex, endTokenIndex);
  // Replacing single quotes with double quotes for JSON parsing
  const defaultTokensJsonStr = defaultTokensStr.replace(/'/g, '"').split('\n').map((i: any) => i.replace(/:\//, '-')).filter((i: any) => !i.includes('null')).join('\n');
  // Replacing property names without double quotes
  const formattedJsonStr = defaultTokensJsonStr.replace(/([a-zA-Z0-9]+):/g, '"$1":');

  // Removing leading comma if any
  const formattedJson = formattedJsonStr.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
  console.log(formattedJson.slice(750, 805))

  try {
    const defaultTokens = JSON.parse(formattedJson);
    return defaultTokens;
  } catch (error) {
    console.error('Error parsing DEFAULT_TOKENS:', error);
    return null;
  }
}

bridge().then(console.log).catch(console.error)