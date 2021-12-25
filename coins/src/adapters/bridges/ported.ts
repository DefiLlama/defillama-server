
/*
async function transformOkexAddress() {
  const okexBridge = (
    await utils.fetchURL(
      "https://www.okex.com/v2/asset/cross-chain/currencyAddress"
    )
  ).data.data.tokens;
  // TODO
  return (addr) => {
    if (compareAddresses(addr, "0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c")) {
      return "avax:0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c";
    }
    // Native token -> OKB
    if (compareAddresses(addr, "0x0000000000000000000000000000000000000000")) {
      return "0x75231f58b43240c9718dd58b4967c5114342a86c";
    }
    return `okexchain:${addr}`;
  };
}

async function transformHecoAddress() {
  return (addr) => {
    if (addr.toLowerCase() == "0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c") {
      return "avax:0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c";
    }
    if (addr.toLowerCase() == "0x0000000000000000000000000000000000000000") {
      return "0x6f259637dcd74c767781e37bc6133cd6a68aa161";
    }
    return `heco:${addr}`;
  };
}


async function transformMoonriverAddress() {
  return (addr) => {
    if (compareAddresses(addr, "0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c")) {
      return "avax:0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c";
    }
    if (compareAddresses(addr, "0x0000000000000000000000000000000000000000")) {
      return "moonriver:0x98878B06940aE243284CA214f92Bb71a2b032B8A";
    }
    return `moonriver:${addr}`; //`optimism:${addr}` // TODO: Fix
  };
}

async function transformKccAddress() {
  return (addr) => {
    if (compareAddresses(addr, "0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c")) {
      return "avax:0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c";
    }
    if (
      compareAddresses(
        addr.toLowerCase(),
        "0x0039f574ee5cc39bdd162e9a88e3eb1f111baf48"
      )
    ) {
      return "0xdac17f958d2ee523a2206206994597c13d831ec7";
    }
    if (compareAddresses(addr, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")) {
      return "okexchain:0xc946daf81b08146b1c7a8da2a851ddf2b3eaaf85";
    }
    if (compareAddresses(addr, "0x639a647fbe20b6c8ac19e48e2de44ea792c62c5c")) {
      return "bsc:0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    }
    if (compareAddresses(addr, "0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d")) {
      return "0x4fabb145d64652a948d72533023f6e7a623c7c53";
    }
    if (compareAddresses(addr, "0xc9baa8cfdde8e328787e29b4b078abf2dadc2055")) {
      return "0x6b175474e89094c44da98b954eedeac495271d0f";
    }
    if (compareAddresses(addr, "0x218c3c3d49d0e7b37aff0d8bb079de36ae61a4c0")) {
      return "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
    }
    if (compareAddresses(addr, "0xf55af137a98607f7ed2efefa4cd2dfe70e4253b1")) {
      return "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    }
    if (compareAddresses(addr, "0x980a5afef3d17ad98635f6c5aebcbaeded3c3430")) {
      return "okexchain:0xc946daf81b08146b1c7a8da2a851ddf2b3eaaf85";
    }
    return `kcc:${addr}`;
  };
}

const chainTransforms = {
  celo: transformCeloAddress,
  fantom: transformFantomAddress,
  bsc: transformBscAddress,
  polygon: transformPolygonAddress,
  xdai: transformXdaiAddress,
  avax: transformAvaxAddress,
  heco: transformHecoAddress,
  harmony: transformHarmonyAddress,
  optimism: transformOptimismAddress,
  moonriver: transformMoonriverAddress,
  okex: transformOkexAddress,
  kcc: transformKccAddress,
  arbitrum: transformArbitrumAddress,
  iotex: transformIotexAddress,
};
async function getChainTransform(chain) {
  if (chain === "ethereum") {
    return (id) => id;
  }
  if (chainTransforms[chain] !== undefined) {
    return chainTransforms[chain]();
  }
  return (addr) => `${chain}:${addr}`;
}

module.exports = {
  getChainTransform,
  transformCeloAddress,
  transformFantomAddress,
  transformBscAddress,
  transformPolygonAddress,
  transformXdaiAddress,
  transformAvaxAddress,
  transformHecoAddress,
  transformHarmonyAddress,
  transformOptimismAddress,
  transformMoonriverAddress,
  fixAvaxBalances,
  transformOkexAddress,
  transformKccAddress,
  transformArbitrumAddress,
  fixHarmonyBalances,
  transformIotexAddress,
};
*/