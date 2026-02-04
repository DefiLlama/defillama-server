import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";

const config: {
  [symbol: string]: {
    addresses: { [chain: string]: string };
    decimals: number;
    NAV: number;
  };
} = {
  WTGXX: {
    addresses: {
      arbitrum: "0xfeb26f0943c3885b2cb85a9f933975356c81c33d",
      avax: "0x870FD36B3bf7f5abeEEa2C8D4abdF1dc4E33109d",
      base: "0x5096b85Ed11798fDdCB8b5CB27C399c04689c435",
      ethereum: "0x1feCF3d9d4Fee7f2c02917A66028a48C6706c179",
      optimism: "0x870FD36B3bf7f5abeEEa2C8D4abdF1dc4E33109d",
      plume_mainnet: "0xCF7a8813bD3bdAF70A9f46d310Ce1EE8D80a4F5a",
    },
    decimals: 18,
    NAV: 1.0,
  },
  FLTTX: {
    addresses: {
      arbitrum: "0x3b9C11cB16B4c9EeB1408dad409afbe800AbDE3f",
      avax: "0xDC8E5A4954B1B4245E910Fc17C9B4E4aa407595D",
      base: "0xcE6C2fDF6676e80F29D7f15B012A3a92cA3008C4",
      ethereum: "0x98F865Bd2E5a3e289b8CCA54f24A7Eeb2bBa56cE",
      optimism: "0xDC8E5A4954B1B4245E910Fc17C9B4E4aa407595D",
      plume_mainnet: "0x3A446721A8818c8DdE3EB9Bfa5Bb3Cd9e8532109",
    },
    decimals: 18,
    NAV: 1.011,
  },
  WTSIX: {
    addresses: {
      arbitrum: "0xf414bFBE375941b1BA91B1A5683FE2C59d2c7b9B",
      avax: "0x69690e156Ab458901a4B71C3Fc5f5b8A598B931d",
      base: "0xCf997c6A8DbdC1449e4dDE59Dbdf9cf6dA9d41c1",
      ethereum: "0x518FB6aFeFea9bB0A5135014d8032EDEe4a8B1eC",
      optimism: "0x69690e156Ab458901a4B71C3Fc5f5b8A598B931d",
      plume_mainnet: "0xdB6C0e250383bce1659Df87621D8a85FCB2e91e1",
    },
    decimals: 18,
    NAV: 10.352,
  },
  EQTYX: {
    addresses: {
      arbitrum: "0x6bb04085922d08d1c7De0Cfe95f7626a6F54Be95",
      avax: "0x8ac0d6B94AE23ad40407BC4DC16D74F09131EB48",
      base: "0xf4A3d6Da7E5F8A262B731DeEE62549C2c05035F5",
      ethereum: "0xA14669a76B12F94d6Ad09304aD15905e900a6E25",
      optimism: "0x8ac0d6B94AE23ad40407BC4DC16D74F09131EB48",
      plume_mainnet: "0xe4B687CF0070D62B9D6d202BFbE410f45db07Cff",
    },
    decimals: 18,
    NAV: 13.174,
  },
  LNGVX: {
    addresses: {
      arbitrum: "0x777A4d310cf66C1D272c7cd17Bd054a456A26d34",
      avax: "0xf5FE77F469e598ECD2c08E5f874c206f8CFEe807",
      base: "0xC290Ff6eE86454B83a31C61010cd50DD53A56F24",
      ethereum: "0x2EcAD4280b7720Ba4F3830B47AB8eF2dA4763f04",
      optimism: "0xf5FE77F469e598ECD2c08E5f874c206f8CFEe807",
      plume_mainnet: "0x7008c33b50DcB55FAb47AA5b5f0B293cb0D17e54",
    },
    decimals: 18,
    NAV: 12.262,
  },
  MODRX: {
    addresses: {
      arbitrum: "0x496D35292D68c988Ba37668cA92AafdaF5c35415",
      avax: "0x06EE92531ff2C8fDB5348b31B41DF0F9a3a1CA97",
      base: "0x90A5aAD303D2170Bc846cd1237939Ac537F224A1",
      ethereum: "0xFb20015Fb2047320a0f1c209f35c6432147770E8",
      optimism: "0x06EE92531ff2C8fDB5348b31B41DF0F9a3a1CA97",
      plume_mainnet: "0x3A269F19A624F8a822712393CbF37fc8BA667056",
    },
    decimals: 18,
    NAV: 11.978,
  },
  TECHX: {
    addresses: {
      arbitrum: "0x5EF799DcE2E8272B4A72a62c0d34250Ef7e42ac0",
      avax: "0x7f259541089253a037E1367Ac09Beed98F1A7974",
      base: "0xF21cEDcEB91979C7877B98D4D60190215a5e6dC7",
      ethereum: "0x1A17f2bdb023e516F1b32b121F332fA931802A9F",
      optimism: "0x7f259541089253a037E1367Ac09Beed98F1A7974",
      plume_mainnet: "0xD19F630F950D6289713463AB50fAf8A792d8539A",
    },
    decimals: 18,
    NAV: 23.761,
  },
  SPXUX: {
    addresses: {
      arbitrum: "0x4122047076a1106618e984a8776A3F7bbcB1d429",
      avax: "0x1A149E21bd3E74b7018Db79C988B4Ba3bbC1873d",
      base: "0xfec440FdF48860FF6E2265BD1ef9Cae8bB2cCe8a",
      ethereum: "0x873d589F38abBCDD1fCA27261aBA2F1aA0661d44",
      optimism: "0x1A149E21bd3E74b7018Db79C988B4Ba3bbC1873d",
      plume_mainnet: "0x4182704f3f9673B2d99B9F5211aE93AB1E43e67D",
    },
    decimals: 18,
    NAV: 17.968,
  },
  WTLGX: {
    addresses: {
      arbitrum: "0xF9cBf82f5A609a59fb53864FE1B01e010daF6C27",
      avax: "0x449331E1f93b0dBe0d54A7cE8BB3a5585F27848a",
      base: "0x8A4AD570238002E49f9A2681398BF9C822302eee",
      ethereum: "0x4D682cBD74a67B1fFE97A2bb78475a16Efe23e8A",
      optimism: "0x449331E1f93b0dBe0d54A7cE8BB3a5585F27848a",
      plume_mainnet: "0x2FE0605645E6A26d3ca0d9f4F8d57F07AE08AA98",
    },
    decimals: 18,
    NAV: 8.279,
  },
  WTSTX: {
    addresses: {
      arbitrum: "0x19842916B4F346D48526d5bc3eBBC540b408A647",
      avax: "0x15f0FB408097Ce442482A127Edc23371b0201964",
      base: "0xE2ab0b91244c6e04bB92034849768ac9B954112c",
      ethereum: "0xA58B23027CdEb442854bb8063164D1Fd48F37707",
      optimism: "0x15f0FB408097Ce442482A127Edc23371b0201964",
      plume_mainnet: "0x3F96A4B821F8850F301578dDf9eeAa08A5ce73E1",
    },
    decimals: 18,
    NAV: 9.705,
  },
  WTTSX: {
    addresses: {
      arbitrum: "0xC66BB5e302e6948A5A902CC17f1894250Ca82500",
      avax: "0x401e7E6558507764805a545f61C049361aA7a7cb",
      base: "0x3403292bA55fFBFc5a655c75b757b00Fd57Ee51c",
      ethereum: "0xE7D2e561B8E3b1A0125f45da596706110F8953BE",
      optimism: "0x401e7E6558507764805a545f61C049361aA7a7cb",
      plume_mainnet: "0x4000cb3e2105d4B3A28f0ac5B4ACC8CD4eC40612",
    },
    decimals: 18,
    NAV: 10.041,
  },
  CRDYX: {
    addresses: {
      arbitrum: "0x6116715Dc9C7116b01C38485DF55c25EEDf26bc0",
      avax: "0xC6e95B2A2215D496E20d5A97312b2DB9AbFe20B6",
      base: "0x10fe70382576f271caeF5C152266FB458eFB53fa",
      ethereum: "0x9E5621b5Da05435F9931e5CCD01c3c24476155a7",
      optimism: "0x9A64461Bb23019e2BF52781EAB6E2b556E5aC2e3",
      plume_mainnet: "0xccfCF70a7080b9D3CFf339B8ca7a7f7cbebe6DaC",
    },
    decimals: 18,
    NAV: 9.137,
  },
  TIPSX: {
    addresses: {
      arbitrum: "0x4e933C45e1cFdd309Eeef439Bf0eC481C38849DA",
      avax: "0xbe0917F9D9d8a97E5ee0796831e0b05a1eDc8437",
      base: "0x534A448cEb99D8Ce1bBBB556A5C13c6Fe79CA68c",
      ethereum: "0xA4964a2fE606f1D445e36006BcB7f7Faee580042",
      optimism: "0xbe0917F9D9d8a97E5ee0796831e0b05a1eDc8437",
      plume_mainnet: "0x33b77b6A1d50b0eB225412a7Ed20E41d47E6501E",
    },
    decimals: 18,
    NAV: 9.715,
  },
  WTSYX: {
    addresses: {
      arbitrum: "0xeAC8180e6c03bB5E8ed11B1C09e06d4A7A6FEcC4",
      avax: "0xBE310315Ef22D0EB8a91c211a7286b10d21Be7fC",
      base: "0xbb2ce6Adb794F1C9d6779DF86626bB6B4e485818",
      ethereum: "0x3340E2C0ddcc4A035737bC1F5445c7D0Fa6CBF5c",
      optimism: "0xBE310315Ef22D0EB8a91c211a7286b10d21Be7fC",
      plume_mainnet: "0x21d6cC37fD71E5b5Ca5C081EE01668139A13a5D5",
    },
    decimals: 18,
    NAV: 1.012,
  },
};

export async function wisdomtree(timestamp: number = 0) {
  const writes: Write[] = [];

  Object.keys(config).forEach((symbol: string) => {
    const { addresses, decimals, NAV } = config[symbol];
    Object.keys(addresses).forEach((chain) => {
      addToDBWritesList(
        writes,
        chain,
        addresses[chain],
        NAV,
        decimals,
        symbol,
        timestamp,
        "wisdomtree",
        0.8
      );
    });
  });

  return writes;
}