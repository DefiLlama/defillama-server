import getTokenPrices from "./euler";
import getEulerV2TokenPrices from "./eulerV2";

function euler(timestamp: number = 0) {
  return getTokenPrices("ethereum", timestamp);
}

const v2ChainConfigs = {
  ethereum: {
    factory: "0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e",
    vaultLens: "0xA8695d44EC128136F8Afcd796D6ba3Db3cdA8914",
    fromBlock: 20529225,
    vaultCount: 432,
  },
  bob: {
    factory: "0x046a9837A61d6b6263f54F4E27EE072bA4bdC7e4",
    vaultLens: "0xb20343277ad78150D21CC8820fF012efDDa71531",
    fromBlock: 12266832,
    vaultCount: 24,
  },
  sonic: {
    factory: "0xF075cC8660B51D0b8a4474e3f47eDAC5fA034cFB",
    vaultLens: "0x0058F402aaa67868A682DA1bDd2E08c7aA3795eE",
    fromBlock: 5324454,
    vaultCount: 77,
  },
  avax: {
    factory: "0xaf4B4c18B17F6a2B32F6c398a3910bdCD7f26181",
    vaultLens: "0xeE2CaC5Df4984f56395b48e71b1D1E84acFbcD9E",
    fromBlock: 56805794,
    vaultCount: 68,
  },
  berachain: {
    factory: "0x5C13fb43ae9BAe8470f646ea647784534E9543AF",
    vaultLens: "0xa61BC2Df76DBFCeDAe4fAaB7A1341bA98fA76FdA",
    fromBlock: 786314,
    vaultCount: 0,
  },
  bsc: {
    factory: "0x7F53E2755eB3c43824E162F7F6F087832B9C9Df6",
    vaultLens: "0xBfD019C90e8Ca8286f9919DF31c25BF989C6bD46",
    fromBlock: 46370655,
    vaultCount: 58,
  },
  base: {
    factory: "0x7F321498A801A191a93C840750ed637149dDf8D0",
    vaultLens: "0xCCC8D18e40c439F5234042FbEA0f4f1528f52f00",
    fromBlock: 22282408,
    vaultCount: 126,
  },
  // swellchain: {
  //   factory: "0x238bF86bb451ec3CA69BB855f91BDA001aB118b9",
  //   vaultLens: "0x1f1997528FbD68496d8007E65599637fBBe85582",
  //   fromBlock: 2350701,
  //   vaultCount: 0,
  // },
  unichain: {
    factory: "0xbAd8b5BDFB2bcbcd78Cc9f1573D3Aad6E865e752",
    vaultLens: "0x03833b4A873eA1F657340C72971a2d0EbB2B4D82",
    fromBlock: 8541544,
    vaultCount: 37,
  },
};

function eulerV2(timestamp: number = 0) {
  return Promise.all(
    Object.entries(v2ChainConfigs).map(([chain, config]) =>
      getEulerV2TokenPrices(
        chain,
        timestamp,
        config.factory,
        config.fromBlock,
        config.vaultCount,
      ),
    ),
  );
}

export const adapters = {
  // euler,
  eulerV2,
};
