import { isAddressesUsable } from "../utils/countUsers";
import { ProtocolAddresses } from "../utils/types";

export default (
  [
    {
            "id":"4674",
            "name":"YFX V4",
            "addresses":{
                "arbitrum":[
                    "0x5aCf0eBC782c9845b7E74367B14D3B867360efD2",  // router
                    "0xA1dBE14b978541b24C4E88489b8e463094F88dEB"   // rewardRouter
                ],
                "base": [
                    "0xbb1ACaA188337Fb662aE0631B2C537f29D4F9C85",   // router
                ]
            }
    },
    {
      id: "3429",
      name: "YFX",
      addresses: {
        arbitrum: [
          "0xebb4871d1be1262C8bd1aa7dfc4C047483f02028", // yfx-v3
          "0xcC619251bB94b7605A7Ea7391fEB7D18C32552D5", // yfx-v4
        ],
      },
    },
    {
      id: "parent#uniswap",
      name: "Uniswap",
      addresses: {
        ethereum: [
          // v2
          "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
          "0xf164fc0ec4e93095b804a4795bbe1e041497b92a",
          //v3
          "0xE592427A0AEce92De3Edee1F18E0157C05861564",
          "0x075B36dE1Bd11cb361c5B3B1E80A9ab0e7aa8a60",
          "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
          "0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5", //universalrouter
          "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B", //universalrouter
        ],
        bsc: ["0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897"],
        celo: [
          "0xC73d61d192FB994157168Fb56730FdEc64C9Cb8F",
          // v3
          "0x5615CDAb10dc425a742d643d949a7F474C01abc4",
        ],
        polygon: [
          "0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5", //universalrouter
          "0xE592427A0AEce92De3Edee1F18E0157C05861564", //v3
          "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", //v3
          "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B", //universalrouter2
        ],
        arbitrum: [
          "0xE592427A0AEce92De3Edee1F18E0157C05861564", //v3
          "0x075B36dE1Bd11cb361c5B3B1E80A9ab0e7aa8a60", //v3
          "0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5",
          "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", //v3
          "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B", //universalrouter
        ],
        optimism: [
          "0xE592427A0AEce92De3Edee1F18E0157C05861564", //v3
          "0x075B36dE1Bd11cb361c5B3B1E80A9ab0e7aa8a60", //v3
          "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", //v3
          "0xb555edF5dcF85f42cEeF1f3630a52A108E55A654", //universalrouter
          "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B", //universalrouter
          "0x560DA69Ef841e1272C65eF9ebA538870F8C0c484", //universalrouter
        ],
      },
    },
    {
      id: "parent#sushi",
      name: "Sushiswap",
      addresses: {
        "ethereum": [
          "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f",
          "0xf5bce5077908a1b7370b9ae04adc565ebd643966",
          "0xF70c086618dcf2b1A461311275e00D6B722ef914",
          "0x044b75f554b886A065b9567891e45c79542d7357",
          "0x7af71799C40F952237eAA4D81A77C1af49125113",
          "0xDdC1b5920723F774d2Ec2C3c9355251A20819776",
        ],
        "arbitrum": [
          "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
          "0x74c764d41b77dbbb4fe771dab1939b00b146894a",
          "0x9c6522117e2ed1fE5bdb72bb0eD5E3f2bdE7DBe0",
          "0x9f18658f7206EaA8D885bBfBb95aB6D9f6c6C12F",
          "0xD9988b4B5bBC53A794240496cfA9Bf5b1F8E0523",
        ],
        "optimism": [
          "0xF0cBce1942A68BEB3d1b73F0dd86C8DCc363eF49",
          "0x96E04591579f298681361C6122Dc4Ef405c19385",
          "0xD9988b4B5bBC53A794240496cfA9Bf5b1F8E0523",
          "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
          "0xE52180815c81D7711B83412e53259bed6a3aB70a",
        ],
        "avax": [
          "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
          "0x0711B6026068f736bae6B213031fCE978D48E026",
          "0xD75F5369724b513b497101fb15211160c1d96550",
          "0xbACEB8eC6b9355Dfc0269C18bac9d6E2Bdc29C4F",
          "0x400d75dAb26bBc18D163AEA3e83D9Ea68F6c1804",
          "0xF70c086618dcf2b1A461311275e00D6B722ef914",
        ],
        "polygon": [
          "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
          "0x0319000133d3AdA02600f0875d2cf03D442C3367",
          "0x0dc8E47a1196bcB590485eE8bF832c5c68A52f4B",
          "0x5097CBB61D3C75907656DC4e3bbA892Ff136649a",
          "0x1A52AfDd24994704e61fEC49924d6c5388Ae47fD",
          "0x7CD29170e8fA3fE5204624deDE5A66F4e8161741",
          "0x7A250C60Cde7A5Ca7B667209beAB5eA4E16eed67",
        ],
        "fantom": [
          "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
          "0x3e603C14aF37EBdaD31709C4f848Fc6aD5BEc715",
          "0x3D2f8ae0344d38525d2AE96Ab750B83480c0844F",
          "0x9e4791ad13f14783C7B2A6A7bD8D6DDD1DC95847",
          "0x7cf167390E2526Bc03F3CF6852A7AF1CEC3e243d",
        ],
        "bsc": [
          "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
          "0xF5BCE5077908a1b7370B9ae04AdC565EBd643966",
          "0xD75F5369724b513b497101fb15211160c1d96550",
          "0x7cf167390E2526Bc03F3CF6852A7AF1CEC3e243d",
          "0x97a32B4f8486735075f2cBEcff64208fBF2e610A",
        ],
        "xdai": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0xCaAbdD9Cf4b61813D4a52f980d6BC1B713FE66F5"],
        "arbitrum-nova": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0xbE811A0D44E2553d25d11CB8DC0d3F0D0E6430E6"],
        "boba-avax": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"],
        "boba-bnb": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"],
        "boba": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"],
        "celo": ["0x1421bDe4B10e8dd459b3BCb598810B1337D56842", "0x0711B6026068f736bae6B213031fCE978D48E026"],
        "fuse": ["0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3", "0x0BE808376Ecb75a5CF9bB6D237d16cd37893d904"],
        "goerli": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0xF5BCE5077908a1b7370B9ae04AdC565EBd643966"],
        "harmony": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0x6b2A3FF504798886862Ca5ce501e080947A506A2"],
        "heco": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0xF5BCE5077908a1b7370B9ae04AdC565EBd643966"],
        "moonbeam": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0x80C7DD17B01855a6D2347444a0FCC36136a314de"],
        "moonriver": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0x145d82bCa93cCa2AE057D1c6f26245d1b9522E6F"],
        "okexchain": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"],
        "palm": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"],
        "telos": ["0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"],
        "kava": ["0xc35DADB65012eC5796536bD9864eD8773aBc74C4", "0xbE811A0D44E2553d25d11CB8DC0d3F0D0E6430E6"],
        "metis": ["0xc35DADB65012eC5796536bD9864eD8773aBc74C4", "0xaB235da7f52d35fb4551AfBa11BFB56e18774A65"],
        "bittorrent": ["0xeae23C766a1B25481025a02B2d82a1DB3FC130Ca"],
      },
    },
    {
      id: "2190",
      name: "Sushi BentoBox",
      addresses: {
        "ethereum": [
          "0xf5bce5077908a1b7370b9ae04adc565ebd643966",
          "0xF70c086618dcf2b1A461311275e00D6B722ef914",
          "0x044b75f554b886A065b9567891e45c79542d7357",
          "0x7af71799C40F952237eAA4D81A77C1af49125113",
        ],
        "arbitrum": [
          "0x74c764d41b77dbbb4fe771dab1939b00b146894a",
          "0x9c6522117e2ed1fE5bdb72bb0eD5E3f2bdE7DBe0",
          "0x9f18658f7206EaA8D885bBfBb95aB6D9f6c6C12F",
        ],
        "optimism": [
          "0xF0cBce1942A68BEB3d1b73F0dd86C8DCc363eF49",
          "0x96E04591579f298681361C6122Dc4Ef405c19385",
          "0xD9988b4B5bBC53A794240496cfA9Bf5b1F8E0523",
          "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
        ],
        "polygon": [
          "0x0319000133d3AdA02600f0875d2cf03D442C3367",
          "0x0dc8E47a1196bcB590485eE8bF832c5c68A52f4B",
          "0x5097CBB61D3C75907656DC4e3bbA892Ff136649a",
          "0x1A52AfDd24994704e61fEC49924d6c5388Ae47fD",
          "0x7CD29170e8fA3fE5204624deDE5A66F4e8161741",
        ],
        "avax": [
          "0x0711B6026068f736bae6B213031fCE978D48E026",
          "0xD75F5369724b513b497101fb15211160c1d96550",
          "0xbACEB8eC6b9355Dfc0269C18bac9d6E2Bdc29C4F",
          "0x400d75dAb26bBc18D163AEA3e83D9Ea68F6c1804",
        ],
        "bsc": [
          "0xF5BCE5077908a1b7370B9ae04AdC565EBd643966",
          "0xD75F5369724b513b497101fb15211160c1d96550",
          "0x7cf167390E2526Bc03F3CF6852A7AF1CEC3e243d",
        ],
        "fantom": [
          "0x3e603C14aF37EBdaD31709C4f848Fc6aD5BEc715",
          "0x3D2f8ae0344d38525d2AE96Ab750B83480c0844F",
          "0x9e4791ad13f14783C7B2A6A7bD8D6DDD1DC95847",
        ],
        "arbitrum-nova": ["0xbE811A0D44E2553d25d11CB8DC0d3F0D0E6430E6"],
        "boba-avax": ["0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"],
        "boba-bnb": ["0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"],
        "boba": ["0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"],
        "bittorrent": ["0x8dacffa7F69Ce572992132697252E16254225D38"],
        "celo": ["0x0711B6026068f736bae6B213031fCE978D48E026"],
        "fuse": ["0x0BE808376Ecb75a5CF9bB6D237d16cd37893d904"],
        "xdai": ["0xE2d7F5dd869Fc7c126D21b13a9080e75a4bDb324"],
        "goerli": ["0xF5BCE5077908a1b7370B9ae04AdC565EBd643966"],
        "harmony": ["0x6b2A3FF504798886862Ca5ce501e080947A506A2"],
        "heco": ["0xF5BCE5077908a1b7370B9ae04AdC565EBd643966"],
        "kava": ["0xc35DADB65012eC5796536bD9864eD8773aBc74C4"],
        "metis": ["0xc35DADB65012eC5796536bD9864eD8773aBc74C4"],
        "moonbeam": ["0x80C7DD17B01855a6D2347444a0FCC36136a314de"],
        "moonriver": ["0x145d82bCa93cCa2AE057D1c6f26245d1b9522E6F"],
      },
    },
    {
      id: "397",
      name: "Shibaswap",
      addresses: {
        ethereum: ["0x03f7724180aa6b939894b5ca4314783b0b36b329"],
      },
    },
    {
      id: "221",
      name: "Defi Swap",
      addresses: {
        ethereum: ["0xceb90e4c17d626be0facd78b79c9c87d7ca181b3"],
      },
    },
    {
      id: "parent#pancakeswap",
      name: "Pancakeswap",
      addresses: {
        ethereum: [
          "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4", // v3
          "0xEfF92A263d31888d860bD50809A8D171709b7b1c",
        ],
        bsc: [
          "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4", // v3
          "0x10ED43C718714eb63d5aA57B78B54704E256024E",
          "0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F",
          "0x749fc0E64A3680531d31ACC1dAa8dda0bE438B02",
        ],
        aptos: ["0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa"],
        base: [
          "0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86", // smartrouter
        ],
      },
    },
    {
      id: "179",
      name: "Varen",
      addresses: {
        ethereum: [
          "0xa7ece0911fe8c60bff9e99f8fafcdbe56e07aff1",
          "0x6C0899D124146256a382a9eeB7C8Aca363BcCf46",
          "0x8C8FF722DD407bC5e10c098F97DDdAD390f03D58",
        ],
      },
    },
    {
      id: "324",
      name: "Unicly",
      addresses: {
        ethereum: ["0xe6e90bc9f3b95cdb69f48c7bfdd0ede1386b135a"],
        arbitrum: ["0xE6E90bC9F3b95cdB69F48c7bFdd0edE1386b135a"],
      },
    },
    {
      id: "707",
      name: "Luaswap",
      addresses: {
        ethereum: ["0x1d5c6f1607a171ad52efb270121331b3039dd83e"],
        tomochain: [],
      },
    },
    {
      id: "580",
      name: "Sashimiswap",
      addresses: {
        ethereum: ["0xe4fe6a45f354e845f954cddee6084603cedb9410"],
      },
    } /*
    {//added to compoundv2 file
        "id":"parent#quickswap",
        "name":"Quickswap",
        "addresses":{
            "polygon":[
                "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
                //"Paraswap v5: Augustus Swapper:0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57"
            ]
        }
    },*/,
    {
      id: "parent#kyberswap",
      name: "KyberSwap",
      addresses: {
        ethereum: [
          "0x617Dee16B86534a5d792A4d7A62FB491B544111E", //MetaAggregation Router
          "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5", //MetaAggregation Router v2
          "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83", //Elastic Router
        ],
        polygon: [
          "0x617Dee16B86534a5d792A4d7A62FB491B544111E", //MetaAggregation Router
          "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5", //MetaAggregation Router v2
          "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83", //Elastic Router
        ],
        avax: [
          "0x617Dee16B86534a5d792A4d7A62FB491B544111E", //MetaAggregation Router
          "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5", //MetaAggregation Router v2
          "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83", //Elastic Router
        ],
        bsc: [
          "0x617Dee16B86534a5d792A4d7A62FB491B544111E", //MetaAggregation Router
          "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5", //MetaAggregation Router v2
          "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83", //Elastic Router
        ],
        arbitrum: [
          "0x617Dee16B86534a5d792A4d7A62FB491B544111E", //MetaAggregation Router
          "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5", //MetaAggregation Router v2
          "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83", //Elastic Router
        ],
        optimism: [
          "0x617Dee16B86534a5d792A4d7A62FB491B544111E", //MetaAggregation Router
          "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5", //MetaAggregation Router v2
          "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83", //Elastic Router
        ],
        fantom: [
          "0x617Dee16B86534a5d792A4d7A62FB491B544111E", //MetaAggregation Router
          "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5", //MetaAggregation Router v2
          "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83", //Elastic Router
        ],
        cronos: [
          "0x617Dee16B86534a5d792A4d7A62FB491B544111E", //MetaAggregation Router
          "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5", //MetaAggregation Router v2
          "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83", //Elastic Router
        ],
      },
    },
    {
      id: "parent#balancer",
      name: "Balancer",
      addresses: {
        ethereum: ["0xBA12222222228d8Ba445958a75a0704d566BF2C8"],
        arbitrum: ["0xBA12222222228d8Ba445958a75a0704d566BF2C8"],
        polygon: ["0xBA12222222228d8Ba445958a75a0704d566BF2C8"],
        xdai: ["0xBA12222222228d8Ba445958a75a0704d566BF2C8"],
        base: ["0xBA12222222228d8Ba445958a75a0704d566BF2C8"],
      },
    },
    {
      id: "1799",
      name: "Velodrome",
      addresses: {
        optimism: ["0x9c12939390052919aF3155f41Bf4160Fd3666A6f", "0xa132DAB612dB5cB9fC9Ac426A0Cc215A3423F9c9"],
      },
    },
    {
      id: "2685",
      name: "Arbitrum Exchange",
      addresses: {
        arbitrum: ["0x3E48298A5Fe88E4d62985DFf65Dee39a25914975"],
      },
    } /*
    {
        "id":"parent#trader-joe",
        "name":"Trader Joe",
        "addresses":{
            "arbitrum":[
                "0x7BFd7192E76D950832c77BB412aaE841049D8D9B"
            ],
            "avax":[
                "0xE3Ffc583dC176575eEA7FD9dF2A7c65F7E23f4C3",
            ],
            "bsc":[
                "0xb66A2704a0dabC1660941628BE987B4418f7a9E8",
            ],
            "ethereum":[
                "0x9A93a421b74F1c5755b83dD2C211614dC419C44b"//Lbrouter
            ]
        }
    },*/,
    {
      id: "2307",
      name: "Camelot",
      addresses: {
        arbitrum: ["0xc873fEcbd354f5A56E00E710B90EF4201db2448d"],
      },
    },
    {
      id: "4372",
      name: "Hercules",
      addresses: {
        metis: ["0x14679D1Da243B8c7d1A4c6d0523A2Ce614Ef027C"],
      },
    },
    {
      id: "parent#thena",
      name: "Thena",
      addresses: {
        bsc: ["0xd4ae6eCA985340Dd434D38F470aCCce4DC78D109", "0x8f097E07a07Bf2F031E5513f764DaFC6Df58e818"],
      },
    },
    {
      id: "parent#bancor",
      name: "Bancor",
      addresses: {
        ethereum: ["0x2F9EC37d6CcFFf1caB21733BdaDEdE11c823cCB0"],
      },
    },
    {
      id: "302",
      name: "SpookySwap",
      addresses: {
        fantom: ["0x31F63A33141fFee63D4B26755430a390ACdD8a4d"],
      },
    },
    {
      id: "654",
      name: "Beethoven X",
      addresses: {
        optimism: [
          "0xBA12222222228d8Ba445958a75a0704d566BF2C8", //Vault
        ],
        fantom: ["0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce"],
      },
    },
    {
      id: "2121",
      name: "Frax Swap",
      addresses: {
        arbitrum: ["0x16e71B13fE6079B4312063F7E81F76d165Ad32Ad"],
        ethereum: ["0xC14d550632db8592D1243Edc8B95b0Ad06703867"],
        optimism: ["0xB9A55F455e46e8D717eEA5E47D2c449416A0437F"],
        bsc: ["0x67F755137E0AE2a2aa0323c047715Bf6523116E5"],
        polygon: ["0x67F755137E0AE2a2aa0323c047715Bf6523116E5"],
        avax: ["0x5977b16AA9aBC4D1281058C73B789C65Bf9ab3d3"],
        fantom: ["0x7D21C651Dd333306B35F2FeAC2a19FA1e1241545"],
        boba: [""],
        harmony: [""],
        aurora: [""],
        evmos: [""],
        moonbeam: [""],
        dogechain: [""],
        moonriver: [""],
      },
    },
    {
      id: "2169",
      name: "BabyDogeSwap",
      addresses: {
        bsc: ["0xC9a0F685F39d05D835c369036251ee3aEaaF3c47"],
      },
    },
    {
      id: "parent#zyberswap",
      name: "Zyberswap",
      addresses: {
        arbitrum: ["0xFa58b8024B49836772180f2Df902f231ba712F72", "0x16e71B13fE6079B4312063F7E81F76d165Ad32Ad"],
      },
    },
    {
      id: "246",
      name: "Pangolin",
      addresses: {
        avax: ["0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106"],
      },
    },
    {
      id: "1883",
      name: "iziSwap",
      addresses: {
        arbitrum: ["0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c"],
        polygon: ["0x879bF5D67fAB468879618AcD69E85C02E33b1c0B"],
        bsc: ["0xBd3bd95529e0784aD973FD14928eEDF3678cfad8"],
        aurora: [""],
        telos: [""],
        era: [""],
        ethereumclassic: [""],
        meter: [""],
        cronos: [""],
      },
    },
    {
      id: "1700",
      name: "Wombat Exchange",
      addresses: {
        bsc: [
          "0x19609B03C976CCA288fbDae5c21d4290e9a4aDD7",
          "0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0",
          "0xE2C07d20AF0Fb50CAE6cDD615CA44AbaAA31F9c8",
          "0x489833311676B566f888119c29bd997Dc6C95830",
          "0x04D4e1C1F3D6539071b6D3849fDaED04d48D563d",
        ],
        arbitrum: [
          "0xc4B2F992496376C6127e73F1211450322E580668",
          "0x9da4edBed6068666ea8EF6505C909e1ff8eA5725",
          "0x62A83C6791A3d7950D823BB71a38e47252b6b6F4",
          "0x3f90a5a47364c0467031fB00246192d40E3D2D9D",
        ],
      },
    },
    {
      id: "2675",
      name: "Ramses Exchange",
      addresses: {
        arbitrum: ["0xAAA87963EFeB6f7E0a2711F397663105Acb1805e"],
      },
    } /*
    {
        "id":"parent#apeswap",
        "name":"ApeSwap",
        "addresses":{
            "ethereum":[
                "0x5f509a3C3F16dF2Fba7bF84dEE1eFbce6BB85587"
            ],
            "polygon":[
                "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7"
            ],
            "bsc":[
                "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7",
            ],
            "arbitrum":[
                "0x7d13268144adcdbEBDf94F654085CC15502849Ff"
            ],
            "telos":[
                "0xb9667Cf9A495A123b0C43B924f6c2244f42817BE"
            ]
        }
    },*/,
    {
      id: "2332",
      name: "Equalizer Exchange",
      addresses: {
        fantom: ["0x1A05EB736873485655F29a37DEf8a0AA87F5a447"],
      },
    },
    {
      id: "2528",
      name: "SolidLizard",
      addresses: {
        arbitrum: ["0xF26515D5482e2C2FD237149bF6A653dA4794b3D0"],
      },
    },
    {
      id: "944",
      name: "Platypus Finance",
      addresses: {
        avax: [
          "0x7d7E30E269b7C7b447312d3FDE52e6f118F8e39e",
          "0x73256EC7575D999C360c1EeC118ECbEFd8DA7D12",
          "0x6f6FCbcc00f9AFBD2C266631087798740c685C3B",
        ],
      },
    },
    {
      id: "334",
      name: "MDEX",
      addresses: {
        bsc: [
          "0x7DAe51BD3E3376B8c7c4900E9107f12Be3AF1bA8",
          "0x62c1A0d92B09D0912F7BB9c96C5ecdC7F2b87059",
          "0x0384E9ad329396C3A6A401243Ca71633B2bC4333",
          "0x518a6e9FB2832aDA41415775E5c45dE6EfCF1A3C",
        ],
        heco: [""],
      },
    },
    {
      id: "2108",
      name: "W3swap",
      addresses: {
        bsc: ["0xF29acE1FE5f36389d0dDe450a0195A30c3770245"],
      },
    } /*
    {
        "id":"238",
        "name":"Ellipsis Finance",
        "addresses":{
            "bsc":[
                "0xE014A89c9788dAfdE603a13F2f01390610382471"
            ]
        }
    },*/,
    {
      id: "1726",
      name: "Meshswap",
      addresses: {
        polygon: ["0x10f4A785F458Bc144e3706575924889954946639"],
      },
    },
    {
      id: "2695",
      name: "SmarDex",
      addresses: {
        ethereum: ["0x9a5132e149c547F254C73226DA7f770d43D9EA44"],
        base: [
          "0x5C622Dcc96b6D96ac6c154f99CF081815094CBC9", //SmardexRouter
        ],
        arbitrum: [
          "0xdd4536dD9636564D891c919416880a3e250f975A", //SmardexRouter
        ],
        polygon: [
          "0xA8EF6FEa013034E62E2C4A9Ec1CDb059fE23Af33", //SmardexRouter
        ],
        bsc: [
          "0x391BeCc8DAaf32b9ba8e602e9527Bf9DA04C8deb", //SmardexRouter
        ],
      },
    },
    {
      id: "318",
      name: "Dfyn Network",
      addresses: {
        polygon: [
          "0x5ac32A20a5BB6B87AC91E51cA5b7bba9B8846803",
          "0xA102072A4C07F06EC3B4900FDC4C7B80b6c57429",
          "0x712B5c4CEe26c679F3Ddbb9855369B13aA8F3Dec",
        ],
        fantom: ["0x2724B9497b2cF3325C6BE3ea430b3cec34B5Ef2d"],
        okexchain: [""],
      },
    } /*
    {
        "id":"133",
        "name":"Shell Protocol",
        "addresses":{
            "arbitrum":[
                "0xC32eB36f886F638fffD836DF44C124074cFe3584"
            ]
        }
    },*/,
    {
      id: "2644",
      name: "Maverick Protocol",
      addresses: {
        ethereum: [
          "0x001903de96a72d11d27cd8c2bee003a730e032a8",
          "0x050853d20d1b4f5529cd8dec986b752e7c9d95f7",
          "0x0ce176e1b11a8f88a4ba2535de80e81f88592bad",
          "0x0eb1c92f9f5ec9d817968afddb4b46c564cdedbe",
          "0x11a653ddfbb61e0feff5484919f06d9d254bf65f",
          "0x12378796271f2c5fb1a3206525c4b49a204a8487",
          "0x14b0fdd73e47fac12d98182c0fd1054f362262a6",
          "0x1970523c241756e24d546dc4bfffc1f436ab9671",
          "0x1db8784119dcfe4213a0ceb2c55b07e81c72b475",
          "0x1dc08fb758c89db0d81da0924ea4ba884b68564c",
          "0x20ee9efe1b85b3077c53d648b17936d4ddb4e407",
          "0x214b0b7d3c925b7710601e437aec942b5cbd8d48",
          "0x23f6b8a4093d740a5f39d20a1f543e4b26b7791a",
          "0x257b0a09d1f4b5913f9c813c43dcd0d0115af2f2",
          "0x25f159fd4b15a2a7a9703ca83d0e63df9eeb0a65",
          "0x2ebe19aa2e29c8acadb14be3e7de153b0141e2aa",
          "0x2f3e9cd12dc8eee8c7fea0383ab877b6bead56ab",
          "0x352b186090068eb35d532428676ce510e17ab581",
          "0x3fd899eaf2dda35cf2c7bfcdb27a23d727d9a67c",
          "0x43a81f1e714f12147e5e865c152c6aac14c80bff",
          "0x43c014e1e6afeb8a76fde2420a0b65e1ca06c9bf",
          "0x44f0f76cfbafc2b9b3ad000d588897d1e5381068",
          "0x46557085e28bcc6d8f653a9ee84c6c9b67642b93",
          "0x4789fad0cf791fec659256900074b80c89c47edd",
          "0x48e236fa378ffeaf86443b6a304ce5670c3cd9ab",
          "0x496d3fe47211521eca1fff521d1f8022b0287c9f",
          "0x4a94f0a97615f0bccbc09968b1c49c9ae1eb38a8",
          "0x4efec7ada76685a521278407d9fcf58b8c6e8774",
          "0x52de4ebf8bfb4048f412bcb415a52cb98651f9ed",
          "0x53dc703b78794b61281812f3a901918253beefee",
          "0x55095300bdcb3026b48b4ad05a5feaaba801aac9",
          "0x5cb98367c32d8a1d910461c572c558d57ca68d25",
          "0x5eef9ab433f598d408ec30adf58d182a07a1189d",
          "0x6b04ce6e4d728a97bafd1c78f8ea46b73ada552d",
          "0x6c6fc818b25df89a8ada8da5a43669023bad1f4c",
          "0x7064a1ea78961ef05a510e86540235a4a2e64ca4",
          "0x7174c5aadc47e0b706c333467d2a3b126eb6ed15",
          "0x73ee7d74a1fe9d768112ba40549bc9c2003f9b63",
          "0x757caf1bd60b4e16d6b91f03169a66149306de7a",
          "0x7a2b6d8325c3912939229272256769b06cedb1b2",
          "0x7fafd253ea3f8351e02135b8f0d4ed31a6e7a59d",
          "0x857d1b4f80ecb6ad7e4e7d120ffc1292ee8ddafc",
          "0x85dd09159b42417c1e0782fa2c6ba3b790be9ead",
          "0x87da68bfbaf58ba6a29fed851f0411e7c989b68b",
          "0x991322ee666ec384eeb31bbd97b4dc0c2df14ce1",
          "0x99903bb64e9c1e54a10723afa7f9a094c9f783c8",
          "0xa2cc3e531f49e6e1b0e360f371e6171f5aeaec91",
          "0xa495a38ea3728ac29096c86ca30127003f33af28",
          "0xa53620f536e2c06d18f02791f1c1178c1d51f955",
          "0xa7b1d843ae0c0e5e561149d7624f9e469fcacf4d",
          "0xab1e2d29699146a2e07c3a1c8ad8cb914a536f7a",
          "0xaf29b974b47d900bc6746bf9979be8edc8790a20",
          "0xb04f13750cd764eeceb07e19254564787c9c72bf",
          "0xba7f8b8cf0f13f8d90d4e364d43a3ddd57f39da0",
          "0xbe633b67d7d4197b798179066b503ecd9c04d05b",
          "0xbfe59fd293c4c19487a20178f384be62867bf875",
          "0xc27f074873af25378270cc50b9854cf7a013eab6",
          "0xcb2e6adc815195069977692de2f6e22e920a6b1b",
          "0xccb606939387c0274aaa2426517da315c1154e50",
          "0xcf4595ae4e43bc8c7be90849babc1da27e47813c",
          "0xd1e50b60287faada2a7d5ea5632df78f7f2f0cb8",
          "0xddcd60dcc952023ec4bcd27788384f06e901e61e",
          "0xe1f9a04aeaf788b1494721317c812145dcef2359",
          "0xe870c025ede621834f538468034398cff26ac926",
          "0xe8d7a52aabe8a0569314f28e90fdb8544860a424",
          "0xe94f1ec6aaaba70e109535f88d0c836ce044fd16",
          "0xeab253203605d0b2ca7bde2157009d121cffdd27",
          "0xeb061a4e1ad3f1983655281cb8019ebbf8b30b29",
          "0xeb0f2c77ee979adb69f718b4027d3783b27b0f9e",
          "0xebac4a08dbe9b33320f73b7bc8c3559ff042a9d9",
          "0xedf1335a6f016d7e2c0d80082688cd582e48a6fc",
          "0xf4b0e6fad7443fbb7bbfea7dc1cbe7bf7e574b03",
          "0xf59ce000475cc3962cd366ce05ea2fd6fea5b8aa",
          "0xf7c3d9615221dfa89a835ec5d56dea2990eae54a",
          "0xf7c8ab6912894393e6ee9c0222c672a4441dfea2",
          "0xf8fb2d6bb43f6a422bc1e2a15b0f85afce7e7f05",
          "0xfc0c52a2b66a19b39efbe4332bc42186ada1ee45",
          "0xff3074fd3bccc15b54d2c7fbfe48108a6116a321",
        ],
        era: ["0x39E098A153Ad69834a9Dac32f0FCa92066aD03f4", "0x02E3B9d5462e84518E309116D547c8C772a1C852"],
      },
    },
    {
      id: "597",
      name: "BabySwap",
      addresses: {
        bsc: ["0x325E343f1dE602396E256B67eFd1F61C3A6B38Bd"],
      },
    },
    {
      id: "parent#mm-finance",
      name: "MM Finance",
      addresses: {
        cronos: [""],
        polygon: ["0x7E5E5957De93D00c352dF75159FbC37d5935f8bF"],
        arbitrum: [
          "0x4F879a9d95e01041dDAA607A65F04e0EDbD04139",
          "0x20AB386813F59B92e1C4596f22591bEe92935d83", //v3smartrouter
          "0x611c9F2f536E087BE7d0F02D9F99e5CE9b7E175B",
        ],
      },
    },
    {
      id: "2400",
      name: "Solidly V2",
      addresses: {
        ethereum: ["0x77784f96C936042A3ADB1dD29C91a55EB2A4219f"],
      },
    },
    {
      id: "622",
      name: "Clipper",
      addresses: {
        ethereum: ["0xE7b0CE0526fbE3969035a145C9e9691d4d9D216c"],
        arbitrum: ["0xE7b0CE0526fbE3969035a145C9e9691d4d9D216c", "0x9E233DD6a90678BaaCd89c05ce5C48f43fCc106E"],
        optimism: [
          "0x5130f6cE257B8F9bF7fac0A0b519Bd588120ed40", //ClipperPackedVerifiedExchange
          "0xF33141BC4E9D1d92a2Adba2fa27A09c2DA2AF3eB", //ClipperPermitRouter
        ],
        polygon: [
          "0x6Bfce69d1Df30FD2B2C8e478EDEC9dAa643Ae3B8",
          "0xF33141BC4E9D1d92a2Adba2fa27A09c2DA2AF3eB", //ClipperPermitRouter
        ],
        moonbeam: ["0xCE37051a3e60587157DC4c0391B4C555c6E68255"],
        mantle: [
          "0x769728b5298445BA2828c0f3F5384227fbF590C5", //ClipperPackedVerifiedExchange
        ],
      },
    },
    {
      id: "1732",
      name: "Verse",
      addresses: {
        ethereum: ["0xB4B0ea46Fe0E9e8EAB4aFb765b527739F2718671"],
        smartbch: [""],
      },
    },
    {
      id: "2283",
      name: "3xcalibur",
      addresses: {
        arbitrum: ["0x8e72bf5A45F800E182362bDF906DFB13d5D5cb5d"],
      },
    },
    {
      id: "311",
      name: "SpiritSwap AMM",
      addresses: {
        fantom: ["0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52"],
      },
    },
    {
      id: "602",
      name: "BakerySwap",
      addresses: {
        bsc: ["0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F"],
      },
    },
    {
      id: "942",
      name: "KnightSwap Finance",
      addresses: {
        bsc: ["0x05E61E0cDcD2170a76F9568a110CEe3AFdD6c46f"],
        fantom: ["0x045312C737a6b7a115906Be0aD0ef53A6AA38106"],
      },
    },
    {
      id: "1461",
      name: "WOOFi Swap",
      addresses: {
        fantom: ["0x382A9b0bC5D29e96c3a0b81cE9c64d6C8F150Efb"],
        avax: ["0xC22FBb3133dF781E6C25ea6acebe2D2Bb8CeA2f9"],
        arbitrum: ["0x9aEd3A8896A85FE9a8CAc52C9B402D092B629a30"],
        bsc: ["0xC90bFE9951a4Efbf20aCa5ECd9966b2bF8A01294"],
        optimism: ["0xEAf1Ac8E89EA0aE13E0f03634A4FF23502527024"],
        polygon: ["0x817Eb46D60762442Da3D931Ff51a30334CA39B74"],
        ethereum: ["0x9D1A92e601db0901e69bd810029F2C14bCCA3128"],
      },
    },
    {
      id: "863",
      name: "Yoshi Exchange",
      addresses: {
        bsc: ["0x3a547932e0818403b39fD2453AE74c9004FB902E"],
        fantom: ["0xE4a4642B19C4d0CBA965673cd51422b1EDA0a78d"],
        ethereum: ["0x3aB65d9C1616FF780e1853330a219497CF5D9B67"],
      },
    },
    {
      id: "271",
      name: "Honeyswap",
      addresses: {
        polygon: ["0xaD340d0CD0B117B0140671E7cB39770e7675C848"],
        xdai: [""],
      },
    },
    {
      id: "2129",
      name: "Tomb Swap",
      addresses: {
        fantom: ["0x6D0176C5ea1e44b08D3dd001b0784cE42F47a3A7"],
      },
    },
    {
      id: "1351",
      name: "WigoSwap",
      addresses: {
        bsc: ["0x5023882f4D1EC10544FCB2066abE9C1645E95AA0"],
      },
    },
    {
      id: "2603",
      name: "AlienFi",
      addresses: {
        arbitrum: [
          "0x863e9610E9E0C3986DCc6fb2cD335e11D88f7D5f",
          "0xB8ca857dCd90AfBeD93B30DdCd4E4CC1327c9e5c",
          "0xbd796fac59914dB9A7CBC21f1053c7DC1b900fEA", //masterchef
          "0x8923d3EFEE38e7bb1E8988B024D5169C962CFB73", //masterchef
          "0x4Ad7C3F11ec54d7D066dd114ac403022d3F97E6F", //masterchef
        ],
      },
    },
    {
      id: "373",
      name: "BiSwap",
      addresses: {
        bsc: ["0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8"],
      },
    },
    {
      id: "1823",
      name: "Nomiswap",
      addresses: {
        bsc: [
          "0xD486D0846812266D21e1Ab6c57FCF202DF836dc8",
          "0xD654953D746f0b114d1F85332Dc43446ac79413d",
          "0x9D15d0d737e06a875F3d46621fB52fe79ffA6136",
          "0x4eC3432d9443f05022e2Ff4E54fC7514BE2359e0",
          "0xbF4c0d66Db59Ae8276e0cB7E1Ed36fC4Ac8C1d68",
        ],
      },
    },
    {
      id: "1295",
      name: "BurgerSwap",
      addresses: {
        bsc: [
          "0xe08Ab553720a46C071475838a6cC8D98D1Afb891",
          "0xEfC254D0cdb1924149382d404A2133532D46A777",
          "0xfa9cCB91d28d35E12216e43d8990D31595783600",
          "0xE3F08e81Ec8533D6CD7784B672e4237087b2A7c8",
        ],
      },
    },
    {
      id: "2102",
      name: "Titano Swych",
      addresses: {
        bsc: ["0x2Bf55D1596786F1AE8160e997D655DbE6d9Bca7A"],
      },
    },
    {
      id: "parent#arbswap",
      name: "Arbswap",
      addresses: {
        arbitrum: ["0xD01319f4b65b79124549dE409D36F25e04B3e551"],
        arbitrum_nova: [],
      },
    },
    {
      id: "parent#polycat-finance",
      name: "Polycat Finance",
      addresses: {
        polygon: [
          "0x94930a328162957FF1dd48900aF67B5439336cBD",
          "0xfDC8579B2E19B489c4086eDE85A2D71949138be5", //tankchef
          "0xfaBC099AD582072d26375F65d659A3792D1740fB", //tankchef
        ],
      },
    },
    {
      id: "2384",
      name: "OreoSwap",
      addresses: {
        arbitrum: ["0x38eEd6a71A4ddA9d7f776946e3cfa4ec43781AE6"],
      },
    },
    {
      id: "1824",
      name: "Swapsicle",
      addresses: {
        arbitrum: ["0x3D42A6B7cD504cA2283Bc8F37fea859a11Ca89fb"],
        ethereum: ["0x3D42A6B7cD504cA2283Bc8F37fea859a11Ca89fb"],
        avax: ["0xC7f372c62238f6a5b79136A9e5D16A2FD7A3f0F5"],
        polygon: ["0x0427B42bb6ae94B488dcf549B390A368F8F69058"],
        bsc: ["0x63530632e8fE40aCf8f1f4324f7645256263b64f"],
        optimism: ["0x3D42A6B7cD504cA2283Bc8F37fea859a11Ca89fb"],
        fantom: ["0x422770Fcf2217AF03b4832e9f1F4Bd23946F828b"],
        telos: ["0x9b1adec00a25fffd87a5bb17f61916e1c26f6844"],
      },
    },
    {
      id: "2350",
      name: "KyotoSwap",
      addresses: {
        bsc: ["0x9fd7764e2303E7748736D115304350eC64E403B2"],
      },
    },
    {
      id: "2101",
      name: "FstSwap",
      addresses: {
        bsc: ["0xB3ca4D73b1e0EA2c53B42173388cC01e1c226F40"],
      },
    },
    {
      id: "2751",
      name: "LFGSwap",
      addresses: {
        arbitrum: ["0xF83675ac64a142D92234681B7AfB6Ba00fa38dFF"],
        ethpow: [],
        core: [],
      },
    },
    {
      id: "2166",
      name: "LFGSwap EthereumPoW",
      addresses: {
        ethpow: [],
      },
    },
    {
      id: "2647",
      name: "LFGSwap Core",
      addresses: {
        core: [],
      },
    } /*
    {//listed on compound-v2 users file
        "id":"387",
        "name":"Bearn",
        "addresses":{
            "bsc":[
                "0xC6747954a9B3A074d8E4168B444d7F397FeE76AA",
                "0x3d695c1607a085773547e07dEf1aD3CE3f518Edb",//bearnchef
            ]
        }
    },*/,
    {
      id: "659",
      name: "JetSwap",
      addresses: {
        bsc: ["0xBe65b8f75B9F20f4C522e0067a3887FADa714800"],
      },
    },
    {
      id: "2749",
      name: "Antfarm finance",
      addresses: {
        ethereum: ["0x6d9f0eb21d77c6d24be49a579508471e937d5418"],
        arbitrum: ["0x1272ba8c0bd855ff15c4b29bad660e6f154fca28"],
        polygon_zkevm: ["0x61f4ECD130291e5D5D7809A112f9F9081b8Ed3A5"],
      },
    },
    {
      id: "2763",
      name: "Dove Swap",
      addresses: {
        polygon_zkevm: ["0xc4212b4f901C8Afac75A27C8E8be7b9fa82D74d8"],
      },
    },
    {
      id: "2762",
      name: "Dove Swap",
      addresses: {
        polygon_zkevm: ["0xc4212b4f901C8Afac75A27C8E8be7b9fa82D74d8"],
      },
    },
    {
      id: "561",
      name: "Alita Finance",
      addresses: {
        bsc: [
          "0x730aCC3bBf2443f2EaEaCFc7ac7b4d8DC9E32dB8",
          "0x4f7b2Be2bc3C61009e9aE520CCfc830612A10694",
          "0x28162cda1E767663F68B759AF47801171Aa58815", //incentive
          "0x8ED5fABddb6f899f7FaCf461587f4dAd065AAae7", //masterchef
        ],
      },
    },
    {
      id: "2333",
      name: "Alita Finance",
      addresses: {
        bsc: ["0xbd67d157502A23309Db761c41965600c2Ec788b2"],
      },
    },
    {
      id: "2118",
      name: "WinerySwap",
      addresses: {
        bsc: [
          "0xB115C8392C4C416b227e98d9bbb394bFD03BE965",
          "0x8B07c6CB1b2edA3942369EEC9DF8e12213f99181",
          "0x8bfFB5562ff30f555894E101E6DAD31D271EEd5a",
          "0xBd27399a5aA720250b37b6864F293A27F3D2A043", //masterchef
          "0x21694642bea2D2E0B0f5129a25D753dd9fB9623A", //masterchef
        ],
      },
    },
    {
      id: "317",
      name: "HyperJump",
      addresses: {
        bsc: ["0x3bc677674df90A9e5D741f28f6CA303357D0E4Ec"],
        fantom: ["0x53c153a0df7E050BbEFbb70eE9632061f12795fB"],
        metis: ["0xd96aeE439e6e5B4f3544bF105eb78F3b8B6CD774"],
      },
    },
    {
      id: "2429",
      name: "Paraluni Dex",
      addresses: {
        bsc: ["0xb3ca41D538998f884D9f8cE33703A7f49F112E98"],
      },
    },
    {
      id: "575",
      name: "Coinswap Space",
      addresses: {
        bsc: ["0x34DBe8E5faefaBF5018c16822e4d86F02d57Ec27"],
      },
    },
    {
      id: "544",
      name: "SoulSwap",
      addresses: {
        fantom: [
          "0x6b3d631B87FE27aF29efeC61d2ab8CE4d621cCBF",
          "0x994889A5a2BcfAB67e5242996e1331b74d777834",
          "0x2CDa3B64Da9c1b7F18891E1567bc43eD558D089b",
        ],
        avax: ["0xa4594460A9d3D41e8B85542D34E23AdAbc3c86Ef", "0xE15d319896038aB76f2bc7cE15CBc2689b498570"],
      },
    },
    {
      id: "695",
      name: "Dinosaur Eggs",
      addresses: {
        bsc: ["0xE9C7650b97712C0Ec958FF270FBF4189fB99C071"],
      },
    },
    {
      id: "1306",
      name: "ProtoFi",
      addresses: {
        fantom: ["0xF4C587a0972Ac2039BFF67Bc44574bB403eF5235"],
      },
    },
    {
      id: "1893",
      name: "MIND Games",
      addresses: {
        arbitrum: ["0x750eD5cF0f5278be9C6562399f0791dD221C4f83"],
      },
    },
    {
      id: "595",
      name: "Convergence",
      addresses: {
        ethereum: ["0x8Cda39226daf33ae1Aba0C92C34d1a1982Cf0210", "0x37c7C2ae51E968CEfB82cFF2102727256D36D6eE"],
        moonbeam: [],
      },
    },
    {
      id: "367",
      name: "PinkSwap",
      addresses: {
        bsc: ["0x319EF69a98c8E8aAB36Aea561Daba0Bf3D0fa3ac"],
      },
    },
    {
      id: "867",
      name: "GIBXSwap",
      addresses: {
        bsc: ["0x2fB9Cee9d580cD12E671b8789F2f9fb228A5d2bc"],
      },
    },
    {
      id: "2577",
      name: "Sharky Swap",
      addresses: {
        arbitrum: ["0x29631E68d81b0e02a507f54a799402E8Cfa6a4d8"],
      },
    },
    {
      id: "2203",
      name: "Tetu Swap",
      addresses: {
        polygon: ["0xBCA055F25c3670fE0b1463e8d470585Fe15Ca819"],
      },
    },
    {
      id: "384",
      name: "Firebird",
      addresses: {
        polygon: ["0xb31D1B1eA48cE4Bf10ed697d44B747287E785Ad4"],
        avax: ["0xe0C38b2a8D09aAD53f1C67734B9A95E43d5981c0"],
        arbitrum: ["0x0c6134Abc08A1EafC3E2Dc9A5AD023Bb08Da86C3"],
        dogechain: ["0xe0C38b2a8D09aAD53f1C67734B9A95E43d5981c0"],
        bsc: ["0x92e4F29Be975C1B1eB72E77De24Dccf11432a5bd"],
        cronos: ["0x4A5a7331dA84d3834C030a9b8d4f3d687A3b788b"],
        ethereum: ["0xe0C38b2a8D09aAD53f1C67734B9A95E43d5981c0"],
        fantom: ["0xe0C38b2a8D09aAD53f1C67734B9A95E43d5981c0"],
        optimism: ["0x0c6134Abc08A1EafC3E2Dc9A5AD023Bb08Da86C3"],
      },
    },
    {
      id: "421",
      name: "Paint Swap",
      addresses: {
        fantom: ["0xfD000ddCEa75a2E23059881c3589F6425bFf1AbB"],
      },
    },
    {
      id: "1349",
      name: "Degen Haus",
      addresses: {
        fantom: ["0xC681174dc7639305d762E016cD3aFf93219D6cc1"],
      },
    },
    {
      id: "473",
      name: "Baguette",
      addresses: {
        avax: ["0xF7b1e993d1b4F7348D64Aa55A294E4B74512F7f2"],
      },
    },
    {
      id: "429",
      name: "BambooDeFi",
      addresses: {
        bsc: ["0xBA9DF2c143C502A433d6A876C1a291C9FC940cf9"],
      },
    },
    {
      id: "978",
      name: "ChickenSwap",
      addresses: {
        ethereum: ["0xB72F87Df6B5C004227B6a045fD451cb716669150"],
      },
    },
    {
      id: "976",
      name: "WingSwap",
      addresses: {
        fantom: ["0x2b660040b289B1B570E053b21dd9A6F1067AD7F5"],
      },
    },
    {
      id: "692",
      name: "HurricaneSwap",
      addresses: {
        avax: [
          "0xb9a9BB6CC39387548BAA7185fbFf51d47eef8771",
          "0xB6559dD3cBec057078fBd9477e676a24cCEA0609",
          "0x010D464fE46ABA2FB468a4BB251248d669C67c72",
        ],
      },
    },
    {
      id: "293",
      name: "Lydia",
      addresses: {
        avax: ["0xA52aBE4676dbfd04Df42eF7755F01A3c41f28D27"],
      },
    },
    {
      id: "2687",
      name: "OpenXswap",
      addresses: {
        optimism: ["0x744776F27080b584D447A780ba260c435f3aE7d5", "0x6e0CEf87B1D55ec54d657f0aDA04AE2c90A470bA"],
      },
    },
    {
      id: "815",
      name: "PureSwap",
      addresses: {
        bsc: ["0x3e8743B5453A348606111AB0a4dEe7F70A87f305"],
      },
    },
    {
      id: "391",
      name: "PantherSwap",
      addresses: {
        bsc: ["0xf5048C225a0D220cd784D81f4e07F137fAf35FF8", "0x24f7C33ae5f77e2A9ECeed7EA858B4ca2fa1B7eC"],
      },
    },
    {
      id: "396",
      name: "Polydex",
      addresses: {
        polygon: [
          "0xC60aE14F2568b102F8Ca6266e8799112846DD088",
          "0x5a56cB06d143a7cC0597c4804D5D76f2d5c2be81",
          "0x512Ff58276046636590767B88f418DD84E47ce78",
          "0x56A0b8BA16A84959541CcB3F42E7A9a9d16428F4",
        ],
      },
    },
    {
      id: "1871",
      name: "HunnySwap",
      addresses: {
        avax: ["0x8685aBD6959745E41D64194F42e21bbD25Fd57B3"],
      },
    },
    {
      id: "289",
      name: "YetiSwap",
      addresses: {
        avax: ["0x262DcFB36766C88E6A7a2953c16F8defc40c378A"],
      },
    },
    {
      id: "287",
      name: "0.exchange",
      addresses: {
        avax: ["0x85995d5f8ee9645cA855e92de16FA62D26398060"],
        bsc: ["0xba79bf6D52934D3b55FE0c14565A083c74FBD224"],
        polygon: ["0x9894B0F28CcfA0F5c5F74EAC88f161110C5F8027"],
      },
    },
    {
      id: "2098",
      name: "Muffin",
      addresses: {
        ethereum: ["0xded07E2da859714F69d93f9794344606Ed67907E"],
      },
    },
    {
      id: "532",
      name: "Twindex",
      addresses: {
        bsc: [
          "0x6B011d0d53b0Da6ace2a3F436Fd197A4E35f47EF",
          "0xBCB41906bE2C2724A8CD0dec87512B2463535586",
          "0xdd3565Bd68ef6882657fB17BCD66b436f819eBF3",
        ],
      },
    },
    {
      id: "471",
      name: "Complus Network",
      addresses: {
        avax: ["0x78c18E6BE20df11f1f41b9635F3A18B8AD82dDD1"],
        bsc: ["0x07DC75E8bc57A21A183129Ec29bbCC232d79eE56"],
        polygon: ["0x07DC75E8bc57A21A183129Ec29bbCC232d79eE56"],
        heco: [],
      },
    },
    {
      id: "2779",
      name: "ZenithSwap",
      addresses: {
        arbitrum: ["0x8CA9EF098F84ceDa319Ec12B9d21EeF50AA3624C"],
      },
    },
    {
      id: "2863",
      name: "SaitaSwap",
      addresses: {
        ethereum: ["0x0c17e776CD218252ADFca8D4e761D3fe757e9778", "0x744A4c9c9F40A443ac2A5747D4f3b773e5d86763"],
        bsc: ["0x744A4c9c9F40A443ac2A5747D4f3b773e5d86763"],
      },
    },
    {
      id: "parent#skullswap",
      name: "SkullSwap",
      addresses: {
        fantom: [
          "0x0A239A1fC3Bb5abc6F06ad950e52996308E8E925",
          "0xe8E357B75823D1Cc133ED7265a27BC2D9237527c",
          "0xA4C5457Eca4E36db9062871631351eF627146044",
          "0x6d6E00B42c599ad8F70b2C006ad5135bF93Eb396",
        ],
      },
    },
    {
      id: "2846",
      name: "Solisnek Finance",
      addresses: {
        avax: ["0xeeee17b45E4d127cFaAAD14e2710489523ADB4d8"],
      },
    },
    {
      id: "2803",
      name: "Native",
      addresses: {
        ethereum: ["0x7A27BBD83b5065eEFf85411DFE048Eaac9be2A9D", "0xF1aF55CC38A92A3b072D05e146E27c2E75bB8F2D"],
        bsc: ["0x7A27BBD83b5065eEFf85411DFE048Eaac9be2A9D", "0x83B9fcea670d66626d9db79Af00fc718014C3de8"],
      },
    },
    {
      id: "2821",
      name: "Hamburger Finance",
      addresses: {
        arbitrum: ["0xE5e5Cd7685755BF4c82137639d75b068ed657384"],
      },
    },
    {
      id: "2812",
      name: "Forge SX Trade",
      addresses: {
        arbitrum: ["0xE5e5Cd7685755BF4c82137639d75b068ed657384"],
      },
    },
    {
      id: "2806",
      name: "AstroFi",
      addresses: {
        ethereum: ["0x42c76F3BBC2E4d505420fE5bda4C316fA5234624"],
      },
    },
    {
      id: "2773",
      name: "Auragi Finance",
      addresses: {
        arbitrum: ["0x0FaE1e44655ab06825966a8fCE87b9e988AB6170"],
      },
    },
    {
      id: "2757",
      name: "Glacier Finance",
      addresses: {
        avax: ["0xC5B8Ce3C8C171d506DEb069a6136a351Ee1629DC"],
      },
    },
    {
      id: "2731",
      name: "Swapline",
      addresses: {
        fantom: [
          "0xb2755FeEc193a718f6135351057a63b2F7B95cef",
          "0xFC33f3cac9f6d1713a4B7787dF6a9a33bAD244d6",
          "0x795bF60522F36244E4e51ed5522fE83Df4D3Bf9a",
        ],
      },
    },
    {
      id: "2721",
      name: "Flair Dex",
      addresses: {
        avax: ["0xd79eE05678241C16e6195b9FC0bCc778A02d4324", "0xBfC8f125CFce29789500987A9553395E84bDfDD2"],
      },
    },
    /*
    { //uses firebird router to swap
        "id":"2720",
        "name":"Satin Exchange",
        "addresses":{
            "polygon":[
                "0xb31D1B1eA48cE4Bf10ed697d44B747287E785Ad4"//firebird router
            ]
        }
    },*/
    /*{ // commented due to inactive project/returning error
        "id":"392",
        "name":"WardenSwap",
        "addresses":{
            "bsc":[
                "0x451ef8D6B645a60115EB8b8bEa76B39C0C761004",
                "0x71ac17934b60A4610dc58b715B61e45DCBdE4054",
            ],
            "ethereum":[
                "0x39f97198c5DbC193EB962c4B3B7e447091A18eAB"
            ],
            "avax":[
                "0x5EF960Eb78B8CFc11e654D03BeEB313BaDF5C7C0"
            ],
            "arbitrum":[
                "0x79A556ef2c5b613dB3DFa8797E6772c5AAF86834"
            ],
            "optimism":[
                "0x7EA8c22E6Dcd7bd69eb180664Da68e1f1F11D696"
            ],
        }
    },*/
    {
      id: "351",
      name: "Gravity Finance",
      addresses: {
        polygon: [
          "0x57dE98135e8287F163c59cA4fF45f1341b680248",
          "0xF2e6b6d7F3b62449260ac87B66cEf9e2664C26d7",
          "0xb4A1F1Dd67e129190feeB4bcADB5298D434d54f2",
          "0x57dE98135e8287F163c59cA4fF45f1341b680248",
          "0xEbe141dE74F1E6377f53551C275568d7bcBC4119",
        ],
      },
    },
    {
      id: "1296",
      name: "ZipSwap",
      addresses: {
        arbitrum: ["0x4D70D768f5E1e6a7062973aFB0c7FBDa9bBb42b3"],
        optimism: ["0xE6Df0BB08e5A97b40B21950a0A51b94c4DbA0Ff6", "0x00000000000013adDDC0919642d45f5d9Df09502"],
      },
    },
    {
      id: "1364",
      name: "Narwhalswap",
      addresses: {
        bsc: ["0x849B7b4541CDE9cBE41cfd064d9d7fF459b9cEa4"],
      },
    },
    {
      id: "1074",
      name: "AutoShark",
      addresses: {
        bsc: ["0xB0EeB0632bAB15F120735e5838908378936bd484"],
      },
    },
    {
      id: "883",
      name: "SmartDEX",
      addresses: {
        polygon: ["0x6f5fE5Fef0186f7B27424679cbb17e45df6e2118"],
      },
    },
    {
      id: "2331",
      name: "SwapFish",
      addresses: {
        arbitrum: ["0xcDAeC65495Fa5c0545c5a405224214e3594f30d8"],
        bsc: ["0xcDAeC65495Fa5c0545c5a405224214e3594f30d8"],
      },
    },
    {
      id: "409",
      name: "CafeSwap",
      addresses: {
        polygon: ["0x9055682E58C74fc8DdBFC55Ad2428aB1F96098Fc"],
        bsc: ["0x933DAea3a5995Fb94b14A7696a5F3ffD7B1E385A"],
      },
    },
    {
      id: "1530",
      name: "Excalibur",
      addresses: {
        fantom: ["0xc8Fe105cEB91e485fb0AC338F2994Ea655C78691"],
      },
    },
    {
      id: "1359",
      name: "CapitalDEX",
      addresses: {
        ethereum: ["0xDc6844cED486Ec04803f02F2Ee40BBDBEf615f21"],
      },
    },
    {
      id: "1253",
      name: "HakuSwap",
      addresses: {
        avax: ["0xE6e79A66cB32c53A9d56B18FA737fb5D72c71475", "0x5F1FdcA239362c5b8A8Ada26a256ac5626CC33E0"],
      },
    },
    {
      id: "455",
      name: "ZooCoin",
      addresses: {
        fantom: ["0x40b12a3E261416fF0035586ff96e23c2894560f2", "0xA7843036252e79fBc495814e714F1439dF8Dc8a4"],
      },
    },
    {
      id: "1750",
      name: "CryptoSwap",
      addresses: {
        bsc: ["0xe4964c56f46063F25f2a77269B36a773140Ab325"],
      },
    },
    {
      id: "2865",
      name: "Moonbase Alpha",
      addresses: {
        arbitrum: [
          "0x88FcF70243B4BCC0325060805b7bE9b3DA984805",
          "0x5cb6600359Cd392A6Ffea69781d1C6db6A25A18F", //masterchef
        ],
      },
    },
    {
      id: "1150",
      name: "WraithSwap",
      addresses: {
        fantom: [
          "0x8C9E059a729C17fB294cd782eB66Df3871D29173",
          "0x37b106f101a63D9d06e53140E52Eb6F8A3aC5bBc", //masterchef
        ],
      },
    },
    {
      id: "920",
      name: "Raven",
      addresses: {
        fantom: [
          "0xbCEf0849DDd928835A6Aa130aE527C2703CD832C", //masterchef
          "0x2639779d6CA9091483a2A7b9A1FE77Ab83b90281", //masterchef
        ],
      },
    },
    {
      id: "737",
      name: "Dino.Exchange",
      addresses: {
        bsc: ["0xe12405F0A569A9402fF563FB923A96DC2525D3Eb", "0xc2a88eCE6B6321819D947c9EadEABBa699c16349"],
      },
    },
    {
      id: "1363",
      name: "Oni Exchange",
      addresses: {
        bsc: [
          "0x3f49193f91a07bb87102e5768fa7a61692EA4D9c",
          "0x974A8959c52f6109C59d0A6D63D4eA4CC522DfA2",
          "0x09a8521FC838D795555113Fcb5b8fC8C267783F9", //masterchef
          "0xE93fC7e6103EF86F3329635B8197D462B74F0cb8", //masterchef
        ],
      },
    },
    {
      id: "1857",
      name: "FATExFi",
      addresses: {
        polygon: ["0x8863f716706e9e4f13A52601A129DD1E1c3fA08B"],
      },
    },
    {
      id: "1859",
      name: "AuraSwap",
      addresses: {
        polygon: [
          "0x09Fd8B8ed6E30e583379Dc73b9261dF5E1A28b6F",
          "0x44Bb1a3E56Cb12b7B1a8E925f09A170e3646346d", //masterchef
        ],
      },
    },
    {
      id: "1018",
      name: "Gains Network",
      addresses: {
        polygon: [
          "0x91993f2101cc758D0dEB7279d41e880F7dEFe827", //gdai
          "0xFb06a737f549Eb2512Eb6082A808fc7F16C0819D", //staking
          "0x4ba64a81ca50D8B66684C664d75b55eaCcFaCAEb", //trading
          "0x8103C0665A544201BBF606d90845d1B2D8005F1c", //nftrewards
          "0xd285f881886505b9Ef6684E1aaa7949a56B0C7Da", //gnsmigration
          "0xa33f7069f075A54481868e4C0b8D26925A218362", //lockingbridge
          "0xDF774A4F3EA5095535f5B8f5b9149caF90FF75Bd", //erc20bridge
          "0x2D266A94469d05C9e06D52A4D0d9C23b157767c2", //GFarmNft5
          "0x02e2c5825C1a3b69C0417706DbE1327C2Af3e6C2", //GFarmNft4
          "0x3378AD81D09DE23725Ee9B9270635c97Ed601921", //GFarmNft3
          "0x77cd42B925e1A82f41d852D6BE727CFc88fddBbC", //GFarmNft2
          "0x7075cAB6bCCA06613e2d071bd918D1a0241379E2", //GFarm2Token(old)
          "0xF9A4c522E327935BD1F5a338c121E14e4cc1f898", //GFarmNft1
        ],
        arbitrum: [
          "0xd85E038593d7A098614721EaE955EC2022B9B91B", //gdai
          "0x6B8D3C08072a020aC065c467ce922e3A36D3F9d6", //staking
          "0x4ba64a81ca50D8B66684C664d75b55eaCcFaCAEb", //trading
          "0x8103C0665A544201BBF606d90845d1B2D8005F1c", //nftrewards
          "0xd285f881886505b9Ef6684E1aaa7949a56B0C7Da", //gnsmigration
          "0x0F9E4375facBeB90DAA850f677819b438ce50827", //ERC721MintingBridge
          "0x01cAaaA682Ceba8cd6c02f93BB1393fB415fA5e2", //erc20bridge
          "0x5e3b541Ad6AcC4381C110247946C863e05ffc9BE", //GFarmNft5
          "0x40F0AeaB6383Be2f254cE40B79089070Fa1a21A1", //GFarmNft4
          "0x9834159EAF9811cf4C568294D5C7C9158F84b384", //GFarmNft3
          "0xD1F024ba4Dbb1593B486cB5031b3AC5aC28e8A4e", //GFarmNft2
          "0x75cbcc5414C539C2B302A5fA60E30B949D2D6F89", //GFarmNft1
        ],
        ethereum: [
          "0x14e2f9B0381Af4227D26BEE7d8E4D424466A7F3F", //GFarmNftSwap
          "0x151757c2E830C467B28Fe6C09c3174b6c76aA0c5", //GNSPoolV5
          "0x1E887E7115321B4ee5d58DD446eC09e12B45d81B", //GFarm
          "0x5cA058C1c9E0Bea6b9b5366ADf73BC7f63aDc2d7", //GFarmNFTExchange
        ],
      },
    },
    {
      id: "337",
      name: "GMX",
      addresses: {
        arbitrum: [
          "0x489ee077994B6658eAfA855C308275EAd8097C4A", //Vault
          "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064", //Router
          "0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868", //PositionRouter
          "0x09f77E8A13De9a35a7231028187e9fD5DB8a2ACB", //OrderBook
          "0x5402B5F40310bDED796c7D0F3FF6683f5C0cFfdf", //StakedGlp
          "0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1", //RewardRouterV2
        ],
        avax: [
          "0x9ab2De34A33fB459b538c43f251eB825645e8595", //Vault
          "0x5F719c2F1095F7B9fc68a68e35B51194f4b6abe8", //Router
          "0xffF6D276Bc37c61A23f06410Dce4A400f66420f8", //PositionRouter
          "0x4296e307f108B2f583FF2F7B7270ee7831574Ae5", //OrderBook
          "0xaE64d55a6f09E4263421737397D1fdFA71896a69", //StakedGlp
          "0x82147C5A7E850eA4E28155DF107F2590fD4ba327", //RewardRouterV2
        ],
      },
    },
    {
      id: "2254",
      name: "MUX Protocol",
      addresses: {
        arbitrum: [
          "0x917952280770Daa800E1B4912Ea08450Bf71d57e", //Vault
          "0x3e0199792Ce69DC29A0a36146bFa68bd7C8D6633", //liquiditypool
          "0x02FAe054ACD7FB1615471319c4E3029DFbC2B23C", //liquiditymanager
          "0xa19fD5aB6C8DCffa2A295F78a5Bb4aC543AAF5e3", //OrderBook
          "0xaf9C4F6A0ceB02d4217Ff73f3C95BbC8c7320ceE", //RewardRouter
        ],
        bsc: [
          "0x8D751570BA1Fd8a8ae89E4B27d18bf6C321Aab0a", //Vault
          "0x855E99F768FaD76DD0d3EB7c446C0b759C96D520", //liquiditypool
          "0xee85CDdCe0CF068091081eA0fcd53f279aa3B09F", //liquiditymanager
          "0xa67aA293642C4e02D1b9F360b007C0dBDc451A08", //OrderBook
        ],
        avax: [
          "0x29a28cC3FdC128693ef6a596eF45c43ff63B7062", //Vault
          "0x0bA2e492e8427fAd51692EE8958eBf936bEE1d84", //liquiditypool
          "0x28f16eB86481066Bf63BcBEB05C8474f7120A36C", //liquiditymanager
          "0x5898c3E218a8501533d771C86e2fA37743ea2aDd", //OrderBook
        ],
        optimism: [
          "0x39d653884B611E0A8dbdb9720Ad5D75642fd544b", //Vault
          "0xc6BD76FA1E9e789345e003B361e4A0037DFb7260", //liquiditypool
          "0xFEc3704f4A02cB0EE6C7d52Cbf72b11E0441E9d5", //liquiditymanager
          "0x6Fde9892Fd5302ac3c68688085BD5b031A63BC9D", //OrderBook
        ],
        fantom: [
          "0xdAF2064F52F123EE1D410e97C2df549c23a99683", //Vault
          "0x2e81F443A11a943196c88afcB5A0D807721A88E6", //liquiditypool
          "0x5898c3E218a8501533d771C86e2fA37743ea2aDd", //liquiditymanager
          "0x0c30b10462CdED51C3CA31e7C51019b7d25a965B", //OrderBook
        ],
      },
    },
    {
      id: "2395",
      name: "Level Finance",
      addresses: {
        bsc: [
          "0xA5aBFB56a78D2BD4689b25B8A77fd49Bb0675874", //LiquidityPool
          "0xB5C42F84Ab3f786bCA9761240546AA9cEC1f8821", //seniorLLP
          "0x4265af66537F7BE1Ca60Ca6070D97531EC571BDd", //MezzanineLLP
          "0xcC5368f152453D497061CB1fB578D2d3C54bD0A0", //Junior LLP
          "0x1Ab33A7454427814a71F128109fE5B498Aa21E5d", //LevelMaster (old farming contract)
          "0x5aE081b6647aEF897dEc738642089D4BDa93C0e7", //LevelMasterV2 (farming contract)
          "0xf584A17dF21Afd9de84F47842ECEAF6042b1Bb5b", //OrderManager
        ],
      },
    },
    {
      id: "2116",
      name: "0x",
      addresses: {
        ethereum: [
          "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
          "0x61935CbDd02287B511119DDb11Aeb42F1593b7Ef", //Exchangev3
          "0x12459C951127e0c374FF9105DdA097662A027093", //Exchangev1
          "0x080bf510FCbF18b91105470639e9561022937712", //Exchangev2.1
          "0xa26e80e7Dea86279c6d778D702Cc413E6CFfA777", //StakingProxyv3
        ],
        bsc: ["0xdef1c0ded9bec7f1a1670819833240f027b25eff"],
        polygon: ["0xdef1c0ded9bec7f1a1670819833240f027b25eff"],
        avax: ["0xdef1c0ded9bec7f1a1670819833240f027b25eff"],
        fantom: ["0xdef189deaef76e379df891899eb5a00a94cbc250"],
        celo: ["0xdef1c0ded9bec7f1a1670819833240f027b25eff"],
        optimism: ["0xdef1abe32c034e558cdd535791643c58a13acc10"],
        arbitrum: ["0xdef1c0ded9bec7f1a1670819833240f027b25eff"],
      },
    },
    {
      id: "2899",
      name: "Vertex",
      addresses: {
        arbitrum: [
          "0xbbee07b3e8121227afcfe1e2b82772246226128e", // endpoint
        ],
      },
    },
    {
      id: "1917",
      name: "Sudoswap",
      addresses: {
        ethereum: ["0x2b2e8cda09bba9660dca5cb6233787738ad68329", "0xb16c1342e617a5b6e4b631eb114483fdb289c0a4"],
      },
    },
    {
      id: "340",
      name: "Olympus DAO",
      addresses: {
        ethereum: [
          "0x007fe7c498a2cf30971ad8f2cbc36bd14ac51156",
          "0x0b7ffc1f4ad541a4ed16b40d8c37f0929158d101",
          "0x73D7e4BDdEcAd7379d679e60f22788E501493896",
          "0xf577c77ee3578c7f216327f41b5d7221ead2b2a3",
          "0xB63cac384247597756545b500253ff8E607a8020",
          "0x007F7735baF391e207E3aA380bb53c4Bd9a5Fed6",
        ],
      },
    },
    {
      id: "2907",
      name: "Chronos V1",
      addresses: {
        arbitrum: [
          "0xE708aA9E887980750C040a6A2Cb901c37Aa34f3b", //routerv2
          "0x5D9dBA2D0ec06F44Da7e234cBB0d7BA921834AE8", //masterchef
          "0xC72b5C6D2C33063E89a50B2F77C99193aE6cEe6c", //voter
        ],
      },
    },
    {
      id: "2903",
      name: "Swaprum",
      addresses: {
        arbitrum: [
          "0x1342a24347532DE79372283B3A29c63C31Dd7711", //v2router
          "0xEE6cbC97781ff3De7a068D2a6A2dec8CE3a05624", //SwaprumWithdrawals
        ],
      },
    },
    {
      id: "2911",
      name: "Aboard Exchange",
      addresses: {
        arbitrum: [
          "0x7a08b29A7Ad4A19A5ECa0c82F5F082872488D135", //PerpetualProxy
        ],
      },
    },
    {
      id: "2902",
      name: "DAMX",
      addresses: {
        fantom: [
          "0xD093eeE7c968CEef2df96cA9949eba1a1A9b2306", //Vault
          "0xeD077045f38f864fba8aD9bdbF1CE8F108e5ddb9", //OrderBook
          "0xECef79f974182f4E9c168E751101F23686Bdc6dF", //staking
        ],
      },
    },
    {
      id: "2900",
      name: "Wasabi",
      addresses: {
        ethereum: [
          "0xFc68f2130e094C95B6C4F5494158cbeB172e18a0", //Wasabi Option NFTs (WASAB)
          "0xF29A66E420C240EbD23F775b93619C8F3cfFf856", //WasabiConduit
          "0x8E2b50413a53F50E2a059142a9be060294961e40", //WasabiPoolFactory
        ],
      },
    },
    {
      id: "2898",
      name: "LionDEX",
      addresses: {
        arbitrum: [
          "0x8eF99304eb88Af9BDe85d58a35339Cb0e2a557B6", //vault
          "0x154E2b1dBE9F493fF7938E5d686366138ddCE017", //staking
          "0xFeb9Cc52aB4cb153FF1558F587e444Ac3DC2Ea82", //Escrowed LionDEX Token (esLION)
        ],
      },
    },
    {
      id: "parent#smbswap",
      name: "SMBSwap",
      addresses: {
        bsc: [
          "0xBDC5104a3C52A3f49f0324696f9Bb77E41516De7", //MasterChef
          "0x009d611490eCfED2dC3F306231Bba7e7F3E9196E", //SMBRouter
          "0x63C737E5BD543ECC0A02d91BfCb50845e1be31cF", //SMBRouter
          "0x9D4823aa89Dc33ED53d930CB554AFFc58B0c9852", //SMBSwapLottery
          "0x85C6129843D120454848F1Da39233AC4fcb50Cb4", //MasterChefV3
          "0x92D118350CAD5EbA374486dbe3d16A9FE66DaeBe", // SmartRouter
        ],
      },
    },
    {
      id: "2886",
      name: "RabbitX",
      addresses: {
        ethereum: [
          "0xFc7f884DE22a59c0009C91733196b012Aecb8F41", //Rabbit
          "0x4973710327eDc6f8238DD2d73cf0B2e081e1B351", //RabbitDeposit
        ],
      },
    },
    {
      id: "2883",
      name: "Purple Bridge DEX",
      addresses: {
        polygon: ["0x1e2441Fd53C51d9CD1696BE2871eE672A0A01933"],
      },
    },
    {
      id: "2872",
      name: "printyfinance",
      addresses: {
        avax: [
          "0x6A8f98d7e34Fd214B428BFc68c9309Ea3C4Fc7F1", //BaseV1Router01
          "0xDc72882909252E133a4A46eFB135b3B145366eba", //PrintyV1Router
          "0x6902a8ecF99a732e5a73491Afc14e5E135eE4234", //BaseV2
        ],
      },
    },
    {
      id: "parent#blur",
      name: "Blur",
      addresses: {
        ethereum: [
          "0x29469395eAf6f95920E59F858042f0e28D98a20B", //ERC1967Proxy
          "0x0000000000A39bb272e79075ade125fd351887Ac", //Blur bidding
        ],
      },
    },
    {
      id: "2919",
      name: "Backed",
      addresses: {
        ethereum: [
          "0xF4d4e4ae7fd9CbAfc24b9B0Da2596260c8368314", //paprcontroller
          "0x3b29c19ff2fcEa0Ff98D0ef5B184354D74eA74b0", //paprcontroller
        ],
      },
    },
    {
      id: "2918",
      name: "DebtDAO",
      addresses: {
        ethereum: [
          "0xc9eF6509A09b92043cedce689DfAA760048aBd7F", //LineFactory
        ],
      },
    },
    {
      id: "2862",
      name: "Hyperliquid",
      addresses: {
        arbitrum: ["0xC67E9Efdb8a66A4B91b1f3731C75F500130373A4", "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7 "],
      },
    },
    {
      id: "319",
      name: "Convex Finance",
      addresses: {
        ethereum: ["0xf403c135812408bfbe8713b5a23a04b3d48aae31", "0x72a19342e8f1838460ebfccef09f6585e32db86e"],
      },
    },
    {
      id: "270",
      name: "Liquity",
      addresses: {
        ethereum: [
          "0x4f9fbb3f1e99b56e0fe2892e623ed36a76fc605d", //staking
          "0x66017d22b0f8556afdd19fc67041899eb65a21bb", //stabilitypool
          "0x24179cd81c9e782a4096035f7ec97fb8b783e007",
        ],
      },
    },
    /*
    Only bridge addresses, not actual users
    {
        "id":"144",
        "name":"dYdX",
        "addresses":{
            "ethereum":[
                "0xd54f502e184b6b739d7d27a6410a67dc462d69c8",
                "0x8e8bd01b5a9eb272cc3892a2e40e64a716aa2a40",
                "0x0fd829c3365a225fb9226e75c97c3a114bd3199e",
                "0x5aa653a076c1dbb47cec8c1b4d152444cad91941"
            ],
        }
    },
    */
    {
      id: "parent#radiant",
      name: "Radiant",
      addresses: {
        arbitrum: [
          "0x8991c4c347420e476f1cf09c03aba224a76e2997",
          "0x196bf3a63c50bca1eff5a5809b72dfc58f0c2c1a",
          "0xebc85d44cefb1293707b11f707bd3cec34b4d5fa",
          "0x2032b9a8e9f7e76768ca9271003d3e43e1616b1f",
          "0x5682a39078edce41a65f1bd8733bf9ca2bbe3b1b",
          "0xc963ef7d977ecb0ab71d835c4cb1bf737f28d010",
        ],
        bsc: [
          "0x13ef2a9e127ae8d9e9b863c7e375ba68e1a42ac6",
          "0xd50cf00b6e600dd036ba8ef475677d816d6c4281",
          "0x7c16abb090d3fb266e9d17f60174b632f4229933",
        ],
      },
    },
    {
      id: "parent#paraspace",
      name: "ParaSpace",
      addresses: {
        ethereum: [
          "0x638a98bbb92a7582d07c52ff407d49664dc8b3ee",
          "0x59b72fdb45b3182c8502cc297167fe4f821f332d",
          "0xf090eb4c2b63e7b26e8bb09e6fc0cc3a7586263b",
          "0xc5c9fb6223a989208df27dcee33fc59ff5c26fff",
        ],
      },
    },
    {
      id: "438",
      name: "Tokemak",
      addresses: {
        ethereum: [
          "0x04bda0cf6ad025948af830e75228ed420b0e860d",
          "0xd3d13a578a53685b4ac36a1bab31912d2b2a2f36",
          "0x8858a739ea1dd3d80fe577ef4e0d03e88561faa3",
          "0x41f6a95bacf9bc43704c4a4902ba5473a8b00263",
        ],
      },
    },
    {
      id: "636",
      name: "Keep3r Network",
      addresses: {
        ethereum: [
          "0x02777053d6764996e594c3e88af1d58d5363a2e6",
          "0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44",
          "0xb9d18ab94cf61bb2bcebe6ac8ba8c19ff0cdb0ca",
        ],
      },
    },
    {
      id: "2255",
      name: "NFTfi",
      addresses: {
        ethereum: ["0xe52cec0e90115abeb3304baa36bc2655731f7934", "0x8252df1d8b29057d1afe3062bf5a64d503152bc8"],
      },
    },
    {
      id: "483",
      name: "NFTX",
      addresses: {
        ethereum: [
          "0x941a6d105802cccaa06de58a13a6f49ebdcd481c",
          "0xdc774d5260ec66e5dd4627e1dd800eff3911345c",
          "0x688c3e4658b5367da06fd629e41879beab538e37",
          "0x3e135c3e981fae3383a5ae0d323860a34cfab893",
        ],
      },
    },
    {
      id: "2086",
      name: "Rage Trade",
      addresses: {
        arbitrum: [
          "0x1d42783E7eeacae12EbC315D1D2D0E3C6230a068", //Curve Yield Strategy
          "0x4b928aFd7CA775C7f4ECdf2c00B7e608962AbbDc", //Rage Trade: Vault Periphery
        ],
      },
    },
    {
      id: "2192",
      name: "PlutusDAO",
      addresses: {
        arbitrum: [
          "0x35cD01AaA22Ccae7839dFabE8C6Db2f8e5A7B2E0", //PlutusPrivateTGE
          "0x195B6eA50150900A25FA0928b8B65B03C7666D10", //TGEController
          "0xc1D8f4109eC84db9b607e2705779142eC8F9534a", //Plutus DAO: TGE Vault ETH
          "0xF4790fc873351C624d225269d4d21cF591e441b2", //Plutus DAO: TGE Vault DPX
          "0xd6c9fe8dbc50c620222e8679CFf0461994b532DA", //Plutus DAO: TGE Vault JONES
          "0x27Aaa9D562237BF8E024F9b21DE177e20ae50c05", //Plutus DAO: 1 Month Plutus Epoch Staking
          "0xE59DADf5F7a9decB8337402Ccdf06abE5c0B2B3E", //Plutus DAO: 3 Month Plutus Epoch Staking
          "0xBEB981021ed9c85AA51d96C0c2edA10ee4404A2e", //Plutus DAO: 6 Month Plutus Epoch Staking
          "0x5593473e318F0314Eb2518239c474e183c4cBED5", //Plutus DAO: MasterChef
          "0x66Cd8Cb1bA49f1A07703fa6E5BFE2BEB2eC8c706", //PlutusDAO: Plutus JONES Depositor
          "0x4D56D5A417269A5bFa909cc0f67DFFE992272606", //Plutus DAO: Dpx Depositor
          "0x20DF4953BA19c74B2A46B6873803F28Bf640c1B5", //PlutusDAO: Old plsDPX Farm
          "0x23B87748b615096d1A0F48870daee203A720723D", //PlutusDAO: plsJONES - Plutus Chef
          "0x6CCD4CFaF4bDa43c09682B3e588B4bd18BFFd603", //PrivateTgeRewards
          "0x548C30b0af3CE6D96F1A63AfC05F0fb66495179F", //PlutusDAO: DPX Depositor
          "0x75c143460F6E3e22F439dFf947E25C9CcB72d2e8", //PlutusDAO: plsDPX Farm
          "0x04B724389Dd28Ffc9a3A91Ab4149a77530282f04", //PrivateTgeVester
          "0xA61f0d1d831BA4Be2ae253c13ff906d9463299c2", //PlutusChef
          "0xb059Fc19371691aa7A3EC66dD80684FFE17A7D5c", //PlutusChef
           "0x5326e71ff593ecc2cf7acae5fe57582d6e74cff1", //PlvGlpToken
          "0x4E5Cf54FdE5E1237e80E87fcbA555d829e1307CE", //PlutusDAO: plvGLP Farm
          "0x8c12e3C9b26Ee2e43A1a71cd974e6bF250472129", //SpaDepositor
          "0x73e7c78E8a85C074733920f185d1c78163b555C8", //
          "0x9F07B8D6DDA7E68260Add1e38447D0Caa6F1BA0d", //PlutusChef
          "0xbe68e51f75F34D8BC06D422056af117b8c23fd54", //
          "0x13794D30D01c96D6595d1D956f3dd70AEc2C238B", //ArbDepositor
          "0xCfc273D86333bF453b847d4D8cb7958307D85196", //
          "0x4C2C41cFfC920CA9dD5F13E88DcF5062ceF37455", //
        ],
      },
    },
    {
      id: "916",
      name: "Pika Protocol",
      addresses: {
        optimism: [
          "0x365324E5045df8c886EBe6AD5449F5CeB5881A40", //PikaPerpV2
          "0x58488bB666d2da33F8E8938Dbdd582D2481D4183", //VaultFeeReward
          "0x2FaE8C7Edd26213cA1A88fC57B65352dbe353698", //Pika Protocol: Perpetual V2
          "0x8123DCe565111F64c01864B2ae0F35e3181A0A02", //PositionManager
          "0xf9B19D0e62278ec9CBBaD5CcA5e7A270979bEa4E", //OrderBook
          "0xD5A8f233CBdDb40368D55C3320644Fb36e597002", //PikaPerpV3
          "0x939c11c596B851447e5220584d37F12854bA02ae", //VaultFeeReward
          "0x78136EF4BDcbdABb8D7aa09a33C3c16Ca6381910", //VaultTokenReward
        ],
      },
    },
    {
      id: "2618",
      name: "OasisSwap",
      addresses: {
        arbitrum: ["0xe805977D5Fa2f05e2175507a1f8E44Cd3F22972c", "0x5bf51bf7af925306866d6cf87b4b85189df67970"],
      },
    },
    {
      id: "1521",
      name: "Horizon Protocol",
      addresses: {
        bsc: [
          "0xFCF3afa6cdA14B438AeEb8FfEd433D196Cd1367F",
          "0x9657a0FD98e88464E1159d98b517A4945dbFBFC8", //DelegateApprovals
          "0xadA58Cf32276CCD03a1C155688eFF8B3BC282285", //PhbStaking
          "0xa1771DCfb7822C8853D7E64B86E58f7f1eB5e33E", //StakingRewards
          "0xE21e39c383ABDce3edf13b7233Ad1ad5FEE42099", //RewardEscrowV2
        ],
      },
    },
    {
      id: "2970",
      name: "Beluga Dex",
      addresses: {
        arbitrum: ["0x7668bcBf650AE69297E411d2A8Ec91e07dd91c0B", "0x48945A091108bBbd54829B632B1dF94BB50F81D7"],
      },
    },
    {
      id: "2968",
      name: "GND Protocol",
      addresses: {
        arbitrum: [
          "0xd8769d8826149B137AF488b1e9Ac0e3AFdbC058a", //UniswapV3LP
        ],
      },
    },
    {
      id: "2957",
      name: "Seashell",
      addresses: {
        arbitrum: [
          "0x5BAC5eEfA13696Cf815388021235b215587263Ea", //Blueberry GLP Compounder LP Token (Blueberry...)
        ],
      },
    },
    {
      id: "2586",
      name: "Equilibre",
      addresses: {
        kava: [
          "0xA7544C409d772944017BB95B99484B6E0d7B6388", //router2
          "0xa337E9426d080970b026caFfb4a83D185b85A124", //GaugeFactory
          "0x7B14b7288D50810a6982149B107238065AA7fcb7", //BribeFactory
          "0x35361C9c2a324F5FB8f3aed2d7bA91CE1410893A", //VotingEscrow
          "0x553796D20BB387E9b3F91Aa35fD289B753D63baF", //VeArtProxy
          "0x8825be873e6578F1703628281600d5887C41C55A", //RewardsDistributor
        ],
      },
    },
    {
      id: "1765",
      name: "Unicrypt",
      addresses: {
        ethereum: [
          "0x663a5c229c09b049e36dcc11a9b0d4a8eb9db214", //univ2locker
          "0xdba68f07d1b7ca219f78ae8582c213d975c25caf", //tokenvesting
          "0x17e00383a843a9922bca3b280c0ade9f8ba48449", //pollocker
          "0xed9180976c2a4742c7a57354fd39d8bec6cbd8ab", //sushilocker
        ],
        bsc: [
          "0xeaed594b5926a7d5fbbc61985390baaf936a6b8d", //TokenVestingBSC
          "0xc765bddb93b0d1c1a88282ba0fa6b2d00e3e0c83", //UniswapV2Locker
          "0xc765bddb93b0d1c1a88282ba0fa6b2d00e3e0c83", //pancakev2locker
          "0xc8B839b9226965caf1d9fC1551588AaF553a7BE6", //pancakev1locker
          "0x74dee1a3e2b83e1d1f144af2b741bbaffd7305e1", //biswaplocker
          "0x1391b48c996ba2f4f38aee07e369a8f28d38220e", //safeswaplocker
          "0x1f23742D882ace96baCE4658e0947cCCc07B6a75", //julswaplocker
          "0xb89a15a4f3518c14c21be04b55546162b0cb39f0", //babydogeswaplocker
        ],
        polygon: [
          "0xadb2437e6f65682b85f814fbc12fec0508a7b1d0", //quickswaplocker
        ],
        avax: [
          "0xa9f6aefa5d56db1205f36c34e6482a6d4979b3bb", //traderjoelocker
        ],
        xdai: [
          "0xe3D32266974f1E8f8549cAf9F54977040e7D1c07", //honeyswaplocker
        ],
      },
    },
    {
      id: "2397",
      name: "Gyroscope Protocol",
      addresses: {
        polygon: [
          "0x37b8E1152fB90A867F3dccA6e8d537681B04705E", //Proto Gyro Dollar (p-GYD)
          "0x68BDeE1bF95AD730F379A05eB8c51fb5dFA07748", //FreezableTransparentUpgradeableProxy
        ],
      },
    },
    {
      id: "3093",
      name: "eZKalibur",
      addresses: {
        era: [
          "0x498f7bB59c61307De7dEA005877220e4406470e9", //router
        ],
      },
    },
    {
      id: "2952",
      name: "Archi Finance",
      addresses: {
        arbitrum: [
          "0x7674Ccf6cAE51F20d376644C42cd69EC7d4324f4", //WETHVaultProxy
          "0x179bD8d1d654DB8aa1603f232E284FF8d53a0688", //USDTVaultProxy
          "0xa7490e0828Ed39DF886b9032ebBF98851193D79c", //USDCVaultProxy
          "0xee54A31e9759B0F7FDbF48221b72CD9F3aEA00AB", //WBTCVaultProxy
        ],
      },
    },
    {
      id: "3173",
      name: "Equity",
      addresses: {
        fantom: [
          "0x9e4105F9E2284532474f69e65680e440F4C91cb8", //Vault
          "0xe8ca91bAe8AA0E9229F6E78f8976B837134b60E8", //ShortsTracker
          "0xA83F31aF44e812d2EdF0536516e7D274cd7301B8", //OrderBook
          "0xd311Fd89e8403c2E90593457543E99cECc70D511", //Router
          "0xf2BfB9cA6e21b30034b9d56Cb4735d2c180cC7e1", //PositionRouter
          "0xfb0c0cE1d43B373b7535Ef556e1D55D285156887", //RewardRouter
          "0x8f02357cb55DbAd26DF5a7558CD810D5D0f05f43", //OrderBookReader
          "0x3e8B14B5534333A2B83a31d778ec3bCd9dc946f4", //RewardReader
          "0x8F6666bd81C4811F433B8232a1c7D4383f11b2dC", //Timelock
          "0xBF65ca2747a1EeebF8a1b0d119De8BE0540c57Cb", //StakedEquity
          "0x88171375F6236885f463341d001B419D477eDB74", //Reader
        ],
      },
    },
    {
      id: "3345",
      name: "DackieSwap",
      addresses: {
        base: [
          "0x195FBc5B8Fbd5Ac739C1BA57D4Ef6D5a704F34f7", //smartrouter
          "0xCfB05AB06D338FD85BBF4486e69809D96A906b77", //nftmanager
          "0xd592e2C815E0cf4B62169e09934FaAB28299708e", //v3lmpooldeployer
        ],
      },
    },
    {
      id: "3341",
      name: "Chronos V2",
      addresses: {
        arbitrum: [
          //univ3 fork
          "0xE0aBdFD837D451640CF43cB1Ec4eE87976eFbb41", //swapRouter
          "0x9aAb66944D66516FEFa26D27267E02af03d17c02", //nftDescriptor
          "0x5e74e05771f0d1222834e66DE5326C82a2C852e0", //nonfungibleTokenPositionDescriptor
          "0x520CAF43e3C6481b71DB95711802ED9179ccA403", //nonfungiblePositionManager
        ],
      },
    },
    {
      id: "3450",
      name: "Aerodrome",
      addresses: {
        base: [
          //velodrome v2 fork
          "0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4", //VotingEscrow
          "0x16613524e02ad97eDfeF371bC883F2F5d6C480A5", //Voter
          "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", //Router
        ],
      },
    },
    {
      id: "3377",
      name: "Friend.tech",
      addresses: {
        base: ["0xcf205808ed36593aa40a44f10c7f7c2f67d4a4d4"],
      },
    },
    {
      id: "3733",
      name: "Chat3",
      addresses: {
        mantle: ["0xAd3dbD09835CF15c543Bc59d31865D659b71060e"],
      },
    },
    {
      id: "970",
      name: "Drift",
      addresses: {
        solana: [
          "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH", // dex program id
          "VAULtLeTwwUxpwAw98E6XmgaDeQucKgV5UaiAuQ655D", // vaults program id
        ],
      },
    },
    {
      id: "parent#baseswap",
      name: "BaseSwap",
      addresses: {
        base: [
          "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86", // router
          "0xc102505248c36f933934d4B2d7579D962a342eBC",
          "0x2B0A43DCcBD7d42c18F6A83F86D1a19fA58d541A",
          "0xDe151D5c92BfAA288Db4B67c21CD55d5826bCc93", // NonfungiblePositionManager
        ],
      },
    },
    {
      id: "3575",
      name: "Scale",
      addresses: {
        base: [
          "0x5E9d25014D01323d6F8c0C6640572e4444d11C94", // router
          "0x3f0458FfB6D106d2F5CdeC9CEdc9054A69275489",
          "0x2F87Bf58D5A9b2eFadE55Cdbd46153a0902be6FA",
        ],
      },
    },
    {
      id: "parent#swapbased",
      name: "SwapBased",
      addresses: {
        base: [
          "0xaaa3b1F1bd7BCc97fD1917c18ADE665C5D31F066", // router
          "0xcb9665E990027e115ccF22230b042e4E7eaBFDB2", // SingleStakingRewardsBase
          "0xE39226E0864252E0fC9bD668FB796FD63a1B75A4", // SingleStakingRewardsBase
          "0x2168eb98C6D416Afb85E7beef5abDc4FB4177dfE", // BlpToken
          "0x265a30f14E34248567B5B0a83978C38dF38D0C60", // RewardRouter
          "0xEfE632dB3A07FeBcEc04f76Ea54D9d49f27bCd57", // SingleStakingRewardsXBase
          "0x272A9acB288915Bb52A0659c8F9f7bFeBA06fae5", // SingleStakingRewardsOtherTokens
          "0x86dAbE269B1c5Ff7fCFf1eA32545489DF66C29EA", // SingleStakingRewardsOtherTokens
        ],
      },
    },
    {
      id: "parent#alien-base",
      name: "Alien Base",
      addresses: {
        base: [
          "0x52eaeCAC2402633d98b95213d0b473E069D86590", // BasedDistributorV2
          "0x7f2ff89d3C45010c976Ea6bb7715DC7098AF786E", // UniswapV2Router02
          "0x927860797d07b1C46fbBe7f6f73D45C7E1BFBb27", // SwapFlashLoan
          "0x8c1A3cF8f83074169FE5D7aD50B978e1cD6b37c7", // UniswapV2Router02
          "0x3485F8E155973cC247CBEa9E77C0dBBB4BBb79E7", // UniswapV2Router02
          "0xe0808b8e2bDD70D70e540f977cF40E26e5811054", // AlienbaseZapV1
          "0xFBE87Ee1Ee62244A2dF80a8093Eab829C52863e8", // PredictionETH
        ],
      },
    },
    {
      id: "3348",
      name: "Soswap",
      addresses: {
        base: [
          "0x53BAE026d9a503d46a58aF4b65FCcbb7B904A911", // SOFIProxy
          "0xBC097E42BF1E6531C32C5cEe945E0c014fA21964", // PortfolioFactory
          "0x1e6Dbd0E827cd243d458ed73B9Ae1a6Db89B8668", // PortfolioModule
          "0x4E69553b0aEf0949Fd38Bbf3EbeD866B431C9E68", // ManagerModule
          "0x73Ada4aE37Ba1DF45Ba12c4478a27029e24cF2d7", // SOFITrading
        ],
      },
    },
    {
      id: "3314",
      name: "RocketSwap Base",
      addresses: {
        base: [
          "0x4cf76043B3f97ba06917cBd90F9e3A2AAC1B306e", // UniswapV2Router02
          "0x234Ccb5c64FDB3958C47E8efBe122b2d54633a96", // RcktLocker
          "0x32C9ACE2d1eB47C3968660De9eF20569f850814D", //
          "0xE20d24cf9fAF458b98B6F34e5346361e6492aA5F",
          "0x304063953727b53048500dfd877A17d1C4f6EaFf", // RcktMasterChef
          "0x2ec62d08277FfC42eB5af71c7595C1a9f9458A3c", // RcktVault
        ],
      },
    },
    {
      id: "3540",
      name: "MoonBase",
      addresses: {
        base: [
          "0x99554FA8B48F735D4Ccce5E077742cF2D084b258", // MoonChef
          "0x4617695387bE48c3202a0A9165549c790C4A08Af", // UniswapRouter
        ],
      },
    },
    {
      id: "3380",
      name: "Baso Finance",
      addresses: {
        base: [
          "0x5568e4F19B9063E0e0386bF66B3eeF2b65327486", // Router
          "0x84B5897A23B067D87Be550e440a3436f6d149fe2", // VotingEscrow
          "0xf11432A2754fCf7BFA1725d37e65840776e39ec7", // RewardsDistributor
          "0xb670568C84C541eacBee2EF7209A6Ba2Ab349BEC", // Voter
          "0xF0FfC7cd3C15EF94C7c5CAE3F39d53206170Fc01", // BasoStaking
        ],
      },
    },
    {
      id: "parent#canary",
      name: "Canary",
      addresses: {
        avax: ["0x06f8ED60393AC6A4B16900273C9313222dfe9940"],
      },
    },
    {
      id: "3977",
      name: "SquaDeFi",
      addresses: {
        base: [
          "0xfad362E479AA318F2De7b2c8a1993Df9BB2B3b1f", // KeyManager
        ],
      },
    },
    {
      id: "3107",
      name: "EigenLayer",
      addresses: {
        ethereum: ["0x858646372cc42e1a627fce94aa7a7033e7cf075a"],
      },
    },
    {
      id: "1004",
      name: "Colony",
      addresses: {
        avax: [
          "0xA2e7ab89A2C59818E1ecD925E718a9d63889A131", // Router
          "0x2aC45f92EABaa8DCB2eA1807A659a1393C3947d0", // Masterchef
          "0x3Db497a9783eBbEda6950d4f1911B3a27D79C071", // AntTiers
          "0x62685d3EAacE96D6145D35f3B7540d35f482DE5b", // StakingV3
          "0x62B38293896e040e36fE5345F9D30DbFd75C04B9", // EarlyStageManager
          "0x17CE2A490CB260b48891aDE019a86f4B4a5520d4", // Comments
          "0xac59c21ADfdDb1E56A959dD60a08c07AaED2F3Ba", // Upvotes
          "0xd071AA359ed1b7776A12c8329f2C337aBED157D7", // Analysis
        ],
      },
    },
    {
      "id":"382",
      "name": "Pendle",
      "addresses":{
          // routers
          ethereum: ["0x888888888889758F76e7103c6CbF23ABbF58F946"],
          arbitrum: ["0x888888888889758F76e7103c6CbF23ABbF58F946"],
          optimism: ["0x888888888889758F76e7103c6CbF23ABbF58F946"],
          mantle: ["0x888888888889758F76e7103c6CbF23ABbF58F946"],
          bsc: ["0x888888888889758F76e7103c6CbF23ABbF58F946"],
      }
  },
  {
    id: "5157",
    name: "Yellow",
    addresses: {
      ethereum: ["0x2A8B51821884CF9A7ea1A24C72E46Ff52dCb4F16"],
      bsc: ["0x2A8B51821884CF9A7ea1A24C72E46Ff52dCb4F16"],
      polygon: ["0x2A8B51821884CF9A7ea1A24C72E46Ff52dCb4F16"],
      base: ["0x2A8B51821884CF9A7ea1A24C72E46Ff52dCb4F16"],
      arbitrum: ["0x2A8B51821884CF9A7ea1A24C72E46Ff52dCb4F16"],
    },
  },
    {
      id: "5195",
      name: "GraFun",
      addresses: {
        bsc: ["0x8341b19a2A602eAE0f22633b6da12E1B016E6451"],
        ethereum: ["0xb8540a7d74Cc4912443e8c4B2064B640FC763c4f"],
      },
    },
    {
      id: "5799",
      name: "Liquidity House",
      addresses: {
        etlk: ["0x0c532e1e916219007f244e2d8Ef46f8530Ec75DE"],
      },
    },
  ] as ProtocolAddresses[]
).filter(isAddressesUsable);
