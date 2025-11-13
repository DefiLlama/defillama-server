import { countUsers, } from "../utils/countUsers";
import * as sdk from "@defillama/sdk";
import { ChainAddresses } from "../utils/types";
import { isAcceptedChain } from "../utils/convertChain";

const comptrollers = [
    {
        name: "compound v2",
        id: "114",
        comptrollers: {
            "ethereum": ["0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B"]
        }
    },
    {
        "id":"parent#apeswap",
        "name":"ApeSwap",
        comptrollers: {
            "bsc":[
                "0xad48b2c9dc6709a560018c678e918253a65df86e",
            ],
        },
        "extraAddresses":{
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
    },
    {
        id: "212",
        name: "Venus",
        comptrollers:{
            "bsc":[
                "0xfD36E2c2a6789Db23113685031d7F16329158384",
            ]
        }
    },
    {
        id: "121",
        name: "CREAM Finance",
        comptrollers:{
            "polygon":[
                "0x20ca53e2395fa571798623f1cfbd11fe2c114c24",
            ],
            "arbitrum":[
                "0xbadaC56c9aca307079e8B8FC699987AAc89813ee"
            ],
            "ethereum":[
                "0xAB1c342C7bf5Ec5F02ADEA1c2270670bCa144CbB",
                "0x5eF4c9384D9d7C39CBC12B62e82900042F1205B4"
            ],
            "bsc":[
                "0x589DE0F0Ccf905477646599bb3E5C622C84cC0BA"
            ]
        }
    },
    {
        id: "2142",
        name: "Sonne Finance",
        comptrollers:{
            "optimism":[
                "0x60CF091cD3f50420d50fD7f707414d0DF4751C58",
            ]
        }
    },
    {
        id: "2537",
        name: "Flux Finance",
        comptrollers:{
            "ethereum":[
                "0x95Af143a021DF745bc78e845b54591C53a8B3A51",
            ]
        }
    },/*
    {
        id: "573",
        name: "Liqee",
        comptrollers:{
            "ethereum":[
                "0x8f1f15DCf4c70873fAF1707973f6029DEc4164b3",
            ],
            "bsc":[
                "0x6d290f45A280A688Ff58d095de480364069af110"
            ]
        }
    },*/
    {
        id: "1303",
        name: "Iron Bank",
        comptrollers:{
            "ethereum":[
                "0xAB1c342C7bf5Ec5F02ADEA1c2270670bCa144CbB",
            ],
            "fantom":[
                "0x4250a6d3bd57455d7c6821eecb6206f507576cd2",
            ],
            "avax":[
                "0x2eE80614Ccbc5e28654324a66A396458Fa5cD7Cc",
            ]
        }
    },
    {
        id: "589",
        name: "Strike",
        comptrollers:{
            "ethereum":[
                "0xe2e17b2CBbf48211FA7eB8A875360e5e39bA2602",
            ]
        }
    },
    {
        id: "2339",
        name: "Lodestar Finance",
        comptrollers:{
            "arbitrum":[
                "0x92a62f8c4750D7FbDf9ee1dB268D18169235117B",
            ]
        }
    },
    {
        id: "450",
        name: "Scream",
        comptrollers:{
            "fantom":[
                "0x260e596dabe3afc463e75b6cc05d8c46acacfb09",
            ]
        }
    },
    {
        id: "1631",
        name: "Onyx Protocol",
        comptrollers:{
            "ethereum":[
                "0x7D61ed92a6778f5ABf5c94085739f1EDAbec2800",
            ]
        }
    }, 
    /*{ // commented due to inactive project/returning error // migrated project
        id: "1614",
        name: "0vix",
        comptrollers:{
            "polygon":[
                "0x8849f1a0cB6b5D6076aB150546EddEe193754F1C",
            ],
            "polygon_zkevm":[
                "0x6EA32f626e3A5c41547235ebBdf861526e11f482",
            ],
        }
    },*/
    {
        id: "2382",
        name: "Tender Finance",
        comptrollers:{
            "arbitrum":[
                "0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e"
            ]
        }
    },/*
    {
        id:"2761",
        name:"Hector Lending",
        comptrollers:{
            "fantom":[
                "0x56644FA0fCfA09b2a04F659E499847611A8AD176",//unitroller
            ]
        }
    },
    {
        id:"136",
        name:"Rari Capital",
        comptrollers:{
        "ethereum":[
            "0xD9F223A36C2e398B0886F945a7e556B41EF91A3C",//unitroller
            "0x6afE6C37bF75f80D512b9D89C19EC0B346b09a8d",//unitroller
            "0x369855b051D1b2dBee88a792DCFc08614ff4e262",//unitroller
            "0xa422890cbBE5EAa8f1c88590fBab7F319D7e24B6",//unitroller
            "0xb42Bc0A99A176a16DE9aF1A490CaE0C6832b43b8",//unitroller
            "0xdac4585B741E5b6625CEc460D2A255fB3FBE0D47",//unitroller
            "0x3f4931a8e9d4cdf8f56e7e8a8cfe3bede0e43657",//unitroller
        ],
        "arbitrum":[
            "0xC7D021BD813F3b4BB801A4361Fbcf3703ed61716"
        ]
    }
    },*/
    {
        id:"338",
        name:"Inverse Finance Frontier",
        comptrollers:{
            "ethereum":[
                "0x4dcf7407ae5c07f8681e1659f626e114a7667339",
            ]
        }
    },
    {
        id:"467",
        name:"Benqi Lending",
        comptrollers:{
            "avax":[
                "0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4",
            ]
        }
    },
    {
        id:"parent#trader-joe",
        name:"Trader Joe",
        comptrollers:{
            "avax":[
                "0xdc13687554205E5b89Ac783db14bb5bba4A1eDaC",//unitroller
            ],
        },
        "extraAddresses":{
            "arbitrum":[
                "0x7BFd7192E76D950832c77BB412aaE841049D8D9B",
                "0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30",//v2.1
            ],
            "avax":[
                "0xE3Ffc583dC176575eEA7FD9dF2A7c65F7E23f4C3",
                "0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30",//v2.1
            ],
            "bsc":[
                "0xb66A2704a0dabC1660941628BE987B4418f7a9E8",
                "0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30",//v2.1
            ]
        }
    },
    {
        id:"368",
        name:"Channels Finance",
        comptrollers:{
            "heco":[
                "0x8955aeC67f06875Ee98d69e6fe5BDEA7B60e9770",
            ],
            "bsc":[
                "0x8Cd2449Ed0469D90a7C4321DF585e7913dd6E715",
            ],
            "arbitrum":[
                "0x3C13b172bf8BE5b873EB38553feC50F78c826284",
            ]
        }
    },
    {
        id:"2818",
        name:"Tonpound",
        comptrollers:{
            "ethereum":[
                "0x1775286Cbe9db126a95AbF52c58a3214FCA26803",
            ]
        }
    },
    {
        id:"607",
        name:"Hundred Finance",
        comptrollers:{
            "ethereum":[
                "0x0f390559f258eb8591c8e31cf0905e97cf36ace2",
            ],
            "fantom":[
                "0x0f390559f258eb8591c8e31cf0905e97cf36ace2",
            ],
            "arbitrum":[
                "0x0f390559f258eb8591c8e31cf0905e97cf36ace2",
            ],
            "gnosis":[
                "0x6bb6ebCf3aC808E26545d59EA60F27A202cE8586",
            ],
            "polygon":[
                "0xedba32185baf7fef9a26ca567bc4a6cbe426e499",
            ],
            "moonriver":[
                "0x7d166777bd19a916c2edf5f1fc1ec138b37e7391",
            ],
            "optimism":[
                "0x5a5755E1916F547D04eF43176d4cbe0de4503d5d",
            ],
            "harmony":[
                "0x0f390559f258eb8591c8e31cf0905e97cf36ace2",
            ],
        }
    },
    {
        id:"897",
        name:"Mesher",
        comptrollers:{
            "ethereum":[
                "0x55e41bc3a99aa24E194D507517b1e8b65eFdAa9e",
            ],
            "klaytn":[
                "0x35dc04eE1D6E600C0d13B21FdfB5C83D022CEF25"
            ]
        }
    },
    /*{ // commented due to inactive project/returning error
        id:"387",
        name:"Bearn",
        comptrollers:{
            "bsc":[
                "0xC6747954a9B3A074d8E4168B444d7F397FeE76AA",
                "0x3d695c1607a085773547e07dEf1aD3CE3f518Edb",//bearnchef
                "0xEEea0D4aAd990c4ede8e064A8Cb0A627B432EDa0",//unitroller
            ]
        }
    },*/
    {
        id:"995",
        name:"Drops",
        comptrollers:{
            "ethereum":[
                "0x7312a3BC8733B068989Ef44bAC6344F07cFcDE7F",
                "0x79b56CB219901DBF42bB5951a0eDF27465F96206",
                "0xB70FB69a522ed8D4613C4C720F91F93a836EE2f5",
                "0x9dEb56b9DD04822924B90ad15d01EE50415f8bC7",
                "0x3903E6EcD8bc610D5a01061B1Dc31affD21F81C6",
                "0x896b8019f5ea3caaAb23cDA0A09B405ed8361E8b",
            ]
        }
    },
    {
        id:"408",
        name:"JetFuel Finance",
        comptrollers:{
            "bsc":[
                "0x67340bd16ee5649a37015138b3393eb5ad17c195",
            ]
        }
    },
    /*{ // commented due to inactive project/returning error
        id:"2808",
        name:"Whitehole Finance",
        comptrollers:{
            "arbitrum":[
                "0x1d019f2d14bdb81bab7ba4ec7e20868e669c32b1",
            ]
        }
    },*/
    {
        id:"629",
        name:"Cozy Finance",
        comptrollers:{
            "ethereum":[
                "0x895879b2c1fbb6ccfcd101f2d3f3c76363664f92",
            ]
        }
    },
    {
        id:"2632",
        name:"LendeXe Finance",
        comptrollers:{
            "ethereum":[
                "0x2c7b7A776b5c3517B77D05B9313f4699Fb38a8d3",
            ]
        }
    },
    {
        id:"1032",
        name:"Percent Finance",
        comptrollers:{
            "ethereum":[
                "0xf47dD16553A934064509C40DC5466BBfB999528B",
            ]
        }
    },
    {
        id:"743",
        name:"Neku",
        comptrollers:{
            "moonriver":[
                "0xD5B649c7d27C13a2b80425daEe8Cb6023015Dc6B",
            ],
            "arbitrum":[
                "0xD5B649c7d27C13a2b80425daEe8Cb6023015Dc6B",
            ],
            "bsc":[
                "0xD5B649c7d27C13a2b80425daEe8Cb6023015Dc6B",
            ],
        }
    },
    {
        id:"486",
        name:"unFederalReserve",
        comptrollers:{
            "ethereum":[
                "0x3105D328c66d8d55092358cF595d54608178E9B5",
            ]
        }
    },
    {
        id:"2183",
        name:"Ape Finance",
        comptrollers:{
            "ethereum":[
                "0xDE607fe5Cb415d83Fe4A976afD97e5DaEeaedB07",
                "0x5aB6Ae481768A1f51DE2493F34984D8aDF924a16"
            ]
        }
    },
    {
        id:"2071",
        name:"dAMM Finance",
        comptrollers:{
            "ethereum":[
                "0x4F96AB61520a6636331a48A11eaFBA8FB51f74e4",
            ]
        }
    },
    {
        id:"1570",
        name:"Rikkei Finance",
        comptrollers:{
            "bsc":[
                "0x4f3e801Bd57dC3D641E72f2774280b21d31F64e4",
            ]
        }
    },
    {
        id:"2186",
        name:"USDFI Lending",
        comptrollers:{
            "bsc":[
                "0x87363D74CD88A6220926Cf64bDEFd23ae63BE115",
            ]
        }
    },
    {
        id:"817",
        name:"CashCow Finance",
        comptrollers:{
            "bsc":[
                "0x44f2A790aCB1bE42d3F7864e9F73762556eb895E",
            ]
        }
    },
    {
        id:"2666",
        name:"wefi",
        comptrollers:{
            "polygon":[
                "0x1eDf64B621F17dc45c82a65E1312E8df988A94D3",
            ]
        }
    },
    /*{ // commented due to inactive project/returning error
        id:"745",
        name:"Atlantis Loans",
        comptrollers:{
            "polygon":[
                "0x8f85ee1c0a96734cb76870106dd9c016db6de09a",
            ],
            "avax":[
                "0x8f85ee1c0a96734cb76870106dd9c016db6de09a",
            ],
            "bsc":[
                "0xE7E304F136c054Ee71199Efa6E26E8b0DAe242F3",
            ],
            "dogechain":[
                "0xA65722af4957CeF481Edb4cB255f804DD36E8aDc",
            ],
        }
    },*/
    {
        id:"996",
        name:"OCP Finance",
        comptrollers:{
            "bsc":[
                "0xc001c415b7e78ea4a3edf165d8f44b70391f8c3c",
            ]
        }
    },
    {
        id:"619",
        name:"Vee Finance",
        comptrollers:{
            "avax":[
                "0xA67DFeD73025b0d61F2515c531dd8D25D4Cfd0Db",
                "0x43AAd7d8Bc661dfA70120865239529ED92Faa054",
                "0xAF7f6F7a1295dEDF52a01F5c3f04Ad1b502CdA6a",
                "0xeEf69Cab52480D2BD2D4A3f3E8F5CcfF2923f6eF"
            ],
            "heco":[
                "0x484C6e804cD4Cc27fCFbCf06748d6b4BCA47db84",
                "0x2a144ACaef8fb9258e4f2c2018945a76fE7342E2"
            ]
        }
    },
    {
        id:"1019",
        name:"OpenDAO",
        comptrollers:{
            "bsc":[
                "0x8ce32b20C94c72998fE40b3D70Af6cC29a4b45E2",
                "0xe8B8F62811F2F9E613185BB4d80DC3989ADaF55D",
                "0x0aBBAba95439dAbc12a6bA59E0713a722a05cB31",
                "0x1B03c3e8C70699724360c9f5ab7344e7c835F37b",
                "0xA21d5c762E13FcfC8541558dAce9BA54f1F6176F",
                "0x1332b00F8164118078A6bC74c9a569863997e9eE",
                "0x88826F399CB7a843fF84f24c0b7662cfF17F45C0",
                "0x8ee2C57434cECfE9501efdB112CfE73adb3c6E68",
                "0x2388E81Ba9f4360e359D88A4513055c5D12a96bA"
            ],
            "ethereum":[
                "0x959Fb43EF08F415da0AeA39BEEf92D96f41E41b3"
            ]
        }
    },
    {
        id:"1775",
        name:"EcoDeFi",
        comptrollers:{
            "bsc":[
                "0xfd1f241ba25b8966a14865cb22a4ea3d24c92451",
            ]
        }
    },
    {
        id:"1234",
        name:"Agile Finance",
        comptrollers:{
            "cronos":[
                "0x643dc7C5105d1a3147Bd9524DFC3c5831a373F1e",
            ]
        }
    },
    {
        id:"2177",
        name:"Fortress Loans",
        comptrollers:{
            "bsc":[
                "0x67340bd16ee5649a37015138b3393eb5ad17c195",
            ]
        }
    },
    /*{ // commented due to inactive project/returning error
        id:"1038",
        name:"FireDAO",
        comptrollers:{
            "ethereum":[
                "0x71908d6faA4c4Ae8717bCe5839b805cC807Ba302",
                "0xF3CbD482Dd5Ac5aB9A0FF9baa68DdaD2f08B1c2f"
            ]
        }
    },*/
    {
        id:"parent#quickswap",
        name:"Quickswap",
        comptrollers:{
            "polygon":[
                "0x9BE35bc002235e96deC9d3Af374037aAf62BDeF7",
                "0x627742AaFe82EB5129DD33D237FF318eF5F76CBC",
                "0x1eD65DbBE52553A02b4bb4bF70aCD99e29af09f8"
            ]
        },
        "extraAddresses":{
            "polygon":[
                "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
                //"Paraswap v5: Augustus Swapper:0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57"
            ]
        }
    },
    {
        id:"1710",
        name:"Fenrir Finance",
        comptrollers:{
            "bsc":[
                "0x56b4B49f31517be8DacC2ED471BCc20508A0e29D",
            ]
        }
    },
    {
        id:"2691",
        name:"Sohei",
        comptrollers:{
            "arbitrum":[
                "0x9f750cf10034f3d7a18221aec0bddab7fc6f32ba",
            ]
        }
    },
    {
        id:"2716",
        name:"Kokomo Finance",
        comptrollers:{
            "arbitrum":[
                "0x91c471053bA4697B13d62De1E850Cc89EbE23633",
            ],
            "optimism":[
                "0x91c471053bA4697B13d62De1E850Cc89EbE23633"
            ]
        }
    },
]

function findAllAddresses(comptrollers:any, extraAddresses:any): ()=>Promise<ChainAddresses>{
    return async()=> {
        const allChainAddresses = extraAddresses ?? {};
        await Promise.all(Object.entries(comptrollers).map(async ([chain, addressList]:[string, any])=>{
            if(!isAcceptedChain(chain)){
                return
            }
            const extra = allChainAddresses?.[chain] ?? []
            const allAddresses = (await Promise.all(addressList.map((address:string) => sdk.api2.abi.call({
                target: address,
                params: [],
                abi: 'address[]:getAllMarkets',
                chain
            })))).flat().concat(addressList, extra);
            allChainAddresses[chain] = allAddresses;
        }))
        return allChainAddresses
    }
}

export const addresses = comptrollers.map(addresses=>({
    name: addresses.name,
    id: addresses.id,
    getAddresses: findAllAddresses(addresses.comptrollers, addresses.extraAddresses)
}))

export default addresses.map(addresses=>({
    name: addresses.name,
    id: addresses.id,
    getAddresses: addresses.getAddresses,
    getUsers: async (start:number, end:number) => countUsers(await addresses.getAddresses())(start, end)
}))