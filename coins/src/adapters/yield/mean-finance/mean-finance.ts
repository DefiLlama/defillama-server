import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { calculate4626Prices } from "../../utils/erc4626";

const wrappers4626: { [chain: string]: string[] } = {
  optimism: [
    '0xda9a381bcbd9173cc841109840feed4d8d7dcb3b', // Aave v3 AAVE
    '0x4a29af8683fFc6259BECcfd583134A0D13BE535c', // Aave v3 DAI
    '0x58ffcdac112d0c0f7b6ac38fb15d178b83663249', // Aave v3 USDT
    '0x8127ce8a7055e2e99c94aee6e20ffc2bdb3770a8', // Aave v3 LINK
    '0x329c754e060c17542f34bf3287c70bfaad7d288a', // Aave v3 SUSD
    '0xfe7296c374d996d09e2ffe533eeb85d1896e1b14', // Aave v3 USDC
    '0x4f8424ba880b109c31ce8c5eefc4b82b8897eec0', // Aave v3 WBTC
    '0xdfc636088b4f73f6bda2e9c31e7ffebf4e3646e9', // Aave v3 WETH
  ],
  polygon: [
    '0x021c618f299e0f55e8a684898b03b027eb51df5c', // Aave v3 WMATIC
    '0x42474cdc4a9d9c06e91c745984dd319c1f107f9a', // Aave v3 WBTC
    '0xa7a7ffe0520e90491e58c9c77f78d7cfc32d019e', // Aave v3 WETH
    '0xe3e5e1946d6e4d8a5e5f155b6e059a2ca7c43c58', // Aave v3 USDC
    '0xcc0da22f5e89a7401255682b2e2e74edd4c62fc4', // Aave v3 AAVE
    '0x6e6bbc7b9fe1a8e5b9f27cc5c6478f65f120fe52', // Aave v3 DAI
    '0x018532fde0251473f3bc379e133cdb508c412eed', // Aave v3 USDT
    '0x5e474399c0d3da173a76ad6676f3c32c97babeaf', // Aave v3 LINK
    '0xc0b8d48064b9137858ccc2d6c07b7432aae2aa90', // Aave v3 AGEUR
    '0x53e41d76892c681ef0d10df5a0262a3791b771ab', // Aave v3 EURS
    '0x2bcf2a8c5f9f8b45ece5ba11d8539780fc15cb11', // Aave v3 CRV
    '0xbf3df32b05efc5d5a084fbe4d2076fbc3ce88f00', // Aave v3 SUSHI
    '0x83c0936d916d036f99234fa35de12988abd66a7f', // Aave v3 GHST
    '0x1dd5629903441b2dd0d03f76ec7673add920e765', // Aave v3 JEUR
    '0x68f677e667dac3b29c646f44a154dec80db6e811', // Aave v3 BAL
    '0x25ad39beee8ddc8d6503ef84881426b65e52c640', // Aave v3 miMATIC
  ],
};

export default async function getTokenPrices(chain: string, timestamp: number) {
  const writes: Write[] = [];
  const tokensInChain = wrappers4626[chain] ?? []

  if (tokensInChain.length > 0) {
    const prices = await calculate4626Prices(chain, timestamp, tokensInChain)
    for (const { token, price, decimals, symbol } of prices) {
      addToDBWritesList(
        writes,
        chain,
        token,
        price,
        decimals,
        symbol,
        timestamp,
        "mean-finance",
        1
      );
    };
  }
  return writes;
}
