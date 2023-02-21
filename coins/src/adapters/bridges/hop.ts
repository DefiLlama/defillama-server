import { fetch } from "../utils"
import {
    addToDBWritesList,
    getTokenAndRedirectData
} from "../utils/database";
import { multiCall } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { ethers } from "ethers"
import { formatUnits } from "ethers/lib/utils";
import { Write } from "../utils/dbInterfaces";

const HOP_BRIDGES_TOKEN_LIST =
    "https://assets.hop.exchange/mainnet/v1-core-config.json";

interface HopTokenList {
    bridges: {
        [key: string]: {
            [key: string]: {
                l2SaddleSwap: string,
                l2SaddleLpToken: string,
                l2CanonicalToken: string,
                l1CanonicalToken?: string
            }
        }
    }
}

interface L2TokenDetails {
    l2SaddleSwap: string,
    l2SaddleLpToken: string,
    token: string,
    l2CanonicalToken: string,
    l1CanonicalToken: string
}

const getAllAddressForChain = async (
    chain: string
) => {
    const hopTokenList: HopTokenList = await fetch(HOP_BRIDGES_TOKEN_LIST)
    let bridgeList = hopTokenList.bridges
    let addressList:
        L2TokenDetails[]
        = []

    for (let token in bridgeList) {
        if (token === "HOP" || bridgeList[token][chain] === undefined) {
            continue
        }
        //const priceChain = chain === "gnosis" ? "xdai" : chain
        let l2SaddleSwap = bridgeList[token][chain].l2SaddleSwap;
        let l2SaddleLpToken = bridgeList[token][chain].l2SaddleLpToken;
        let l2CanonicalToken = bridgeList[token][chain].l2CanonicalToken;
        let l1CanonicalToken = bridgeList[token].ethereum.l1CanonicalToken as string

        addressList.push({
            l2SaddleSwap: l2SaddleSwap,
            l2SaddleLpToken: l2SaddleLpToken,
            token,
            l2CanonicalToken: l2CanonicalToken,
            l1CanonicalToken
        })
    }

    return addressList
}

const getPriceForAllChainAndToken = async (data: string[], chain: string) => {
    let priceData: {
        [token: string]: {
            price: number,
            decimals: number,
        }
    } = {};
    const priceChain = chain === "gnosis" ? "xdai" : chain
    let incomingPrice = await getTokenAndRedirectData(data, priceChain, 0)

    for (let i = 0; i < incomingPrice.length; i++) {
        let symbol = incomingPrice[i].address
        priceData[symbol] = {
            price: incomingPrice[i].price,
            decimals: incomingPrice[i].decimals
        }
    }
    return priceData
}

const getTotalSupplyOfAllL2LpToken = async (
    tokenDetails:
        {
            l2SaddleSwap: string,
            l2SaddleLpToken: string,
            token: string,
            l2CanonicalToken: string,
            l1CanonicalToken: string,
            totalSupply?: string,
            totalSupplyDecimal?: string,
            lpSymbol?: string
        }[]
    , chain: string
) => {
    let abi = {
        "totalSupply": {
            "inputs": [],
            "name": "totalSupply",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        "decimals": {
            "inputs": [],
            "name": "decimals",
            "outputs": [
                {
                    "internalType": "uint8",
                    "name": "",
                    "type": "uint8"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }, "symbol": {
            "inputs": [],
            "name": "symbol",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    }

    let totalSupplyForAllAddress = tokenDetails

    let totalSupplyDetails: {
        [key: string]: string
    } = {};

    let decimalDetails: {
        [key: string]: string
    } = {};

    let symbolDetails: {
        [key: string]: string
    } = {};

    const fixedUpChain = chain === "gnosis" ? "xdai" : chain
    let totalSupply = await multiCall({
        abi: abi.totalSupply,
        calls: tokenDetails.map((tokenDetail) => ({
            target: tokenDetail.l2SaddleLpToken,
            params: []
        })),
        chain: fixedUpChain as Chain
    })

    let decimals = await multiCall({
        abi: abi.decimals,
        calls: tokenDetails.map((tokenDetail) => ({
            target: tokenDetail.l2SaddleLpToken,
            params: []
        })),
        chain: fixedUpChain as Chain
    })

    let symbol = await multiCall({
        abi: abi.symbol,
        calls: tokenDetails.map((tokenDetail) => ({
            target: tokenDetail.l2SaddleLpToken,
            params: []
        })),
        chain: fixedUpChain as Chain
    })

    for (let i = 0; i < totalSupply.output.length; i++) {
        totalSupplyDetails[`${totalSupply.output[i].input.target}`] = totalSupply.output[i].output
    }

    for (let i = 0; i < decimals.output.length; i++) {
        decimalDetails[`${decimals.output[i].input.target}`] = decimals.output[i].output
    }

    for (let i = 0; i < symbol.output.length; i++) {
        symbolDetails[`${symbol.output[i].input.target}`] = symbol.output[i].output
    }

    totalSupplyForAllAddress = tokenDetails.map((tokenDetail) => ({
        ...tokenDetail, totalSupply: totalSupplyDetails[tokenDetail.l2SaddleLpToken],
        totalSupplyDecimal: decimalDetails[tokenDetail.l2SaddleLpToken],
        lpSymbol: symbolDetails[tokenDetail.l2SaddleLpToken]
    }))


    return totalSupplyForAllAddress
}

const getTokenBalanceOfAllL2Swap = async (
    tokenDetails:
        {
            l2SaddleSwap: string,
            l2SaddleLpToken: string,
            token: string,
            l2CanonicalToken: string,
            l1CanonicalToken: string,
            totalSupply?: string,
            tokenAddressIndex0?: string,
            tokenAddressIndex1?: string,
            tokenBalanceIndex0?: string,
            tokenBalanceIndex1?: string
        }[],
    chain: string
) => {
    let abi = {
        "getToken": {
            "inputs": [
                {
                    "internalType": "uint8",
                    "name": "gettoken",
                    "type": "uint8"
                }
            ],
            "name": "getToken",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        "getTokenBalance": {
            "inputs": [
                {
                    "internalType": "uint8",
                    "name": "gettoken",
                    "type": "uint8"
                }
            ],
            "name": "getTokenBalance",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    }

    let balanceForAllAddress = tokenDetails
    let allAddressDetails: {
        [address: string]: {
            [index: string]: string
        }
    } = {};

    let allAddressBalanceDetails: {
        [address: string]: {
            [index: string]: string
        }
    } = {};

    const fixedUpChain = chain === "gnosis" ? "xdai" : chain
    let getToken = await multiCall(
        {
            abi: abi.getToken,
            calls: [
                ...tokenDetails.map((tokenDetail) => ({
                    target: tokenDetail.l2SaddleSwap,
                    params: [0]
                })),
                ...tokenDetails.map((tokenDetail) => ({
                    target: tokenDetail.l2SaddleSwap,
                    params: [1]
                }))
            ],
            chain: fixedUpChain as Chain
        }
    )

    for (let i = 0; i < getToken.output.length; i++) {
        let index = getToken.output[i].input.params[0]
        if (allAddressDetails[`${getToken.output[i].input.target}`] === undefined) {
            allAddressDetails[`${getToken.output[i].input.target}`] = {}
        }
        allAddressDetails[`${getToken.output[i].input.target}`][`${index}`] = `${getToken.output[i].output}`
    }

    let getTokenBalance = await multiCall(
        {
            abi: abi.getTokenBalance,
            calls: [
                ...tokenDetails.map((tokenDetail) => ({
                    target: tokenDetail.l2SaddleSwap,
                    params: [0]
                })),
                ...tokenDetails.map((tokenDetail) => ({
                    target: tokenDetail.l2SaddleSwap,
                    params: [1]
                }))
            ],
            chain: fixedUpChain as Chain
        }
    )

    for (let i = 0; i < getTokenBalance.output.length; i++) {
        let index = getTokenBalance.output[i].input.params[0]
        if (allAddressBalanceDetails[`${getTokenBalance.output[i].input.target}`] === undefined) {
            allAddressBalanceDetails[`${getTokenBalance.output[i].input.target}`] = {}
        }

        allAddressBalanceDetails[`${getTokenBalance.output[i].input.target}`][`${index}`] = `${getTokenBalance.output[i].output}`
    }

    balanceForAllAddress = tokenDetails.map((tokenDetail) => ({
        ...tokenDetail, balanceTokenAddress: allAddressDetails[tokenDetail.l2SaddleSwap]
    }))

    balanceForAllAddress = tokenDetails.map((tokenDetail) => ({
        ...tokenDetail, balanceToken: allAddressBalanceDetails[tokenDetail.l2SaddleSwap]
    }))

    return balanceForAllAddress
};

const addPriceToData = (
    data:
        {
            l2SaddleSwap: string,
            l2SaddleLpToken: string,
            token: string,
            l2CanonicalToken: string,
            l1CanonicalToken: string,
            totalSupply?: string,
            balanceTokenAddress?: {
                [key: string]: string
            },
            balanceToken?: {
                [key: string]: string
            },
            L1Price?: {
                [key: string]: number
            },
            L2Price?: {
                [key: string]: number
            }
        }[]
    ,
    priceDataforL1: {
        [token: string]: {
            [key: string]: number
        }
    },
    priceDataforL2: {
        [token: string]: {
            [key: string]: number
        }
    }
) => {
    return data.map((tokenData) => ({
        ...tokenData, L1Price: priceDataforL1[tokenData.l1CanonicalToken],
        L2Price: priceDataforL2[tokenData.l2CanonicalToken]
    }))
}
const strToBigNumber = (str: string) => {
    return ethers.BigNumber.from(str)
}

/**
 * Hop LPs are saddleswap LPs between L2 token and a representation of L1 token on L2(hToken).
 * Hence, the price is determined by determining the underlying value of L2 token, and the hToken
 * and dividing that by total supply.
 */
const calculateLPTokenPrice = (
    tokenDetails:
        {
            l2SaddleSwap: string;
            l2SaddleLpToken: string;
            token: string;
            l2CanonicalToken: string;
            l1CanonicalToken: string;
            totalSupply?: string;
            totalSupplyDecimal?: string;
            lpSymbol?: string;
            balanceTokenAddress?: {};
            balanceToken?: {
                [key: string]: string
            },
            L1Price?: {
                [key: string]: number
            },
            L2Price?: {
                [key: string]: number
            },
            lpPrice?: number
        }[]
) => {
    for (let i = 0; i < tokenDetails.length; i++) {
        let token = tokenDetails[i]
        let balance = token.balanceToken!
        let totalSupply = token.totalSupply != null ? strToBigNumber(`${token.totalSupply}`) : strToBigNumber("0");
        let totalSupplyDecimal = token.totalSupplyDecimal
        let balanceAt0Index = JSON.parse(balance["0"]) != null ? strToBigNumber(balance["0"]) : strToBigNumber("0")
        let balanceAt0IndexDecimals = token.L1Price?.decimals
        let balanceAt1Index = JSON.parse(balance["1"]) != null ? strToBigNumber(balance["1"]) : strToBigNumber("0")
        let balanceAt1IndexDecimals = token.L2Price?.decimals
        let L1Price = token.L1Price!["price"] != undefined ? token.L1Price!["price"] : 0
        let L2Price = token.L2Price!["price"] != undefined ? token.L2Price!["price"] : 0

        if (totalSupply.gt(0)) {
            let L1Total = +formatUnits(balanceAt0Index, balanceAt0IndexDecimals) * (L1Price)
            let L2Total = +formatUnits(balanceAt1Index, balanceAt1IndexDecimals) * (L2Price)
            let L1L2Total = L1Total + L2Total
            let lpTokenPrice = L1L2Total / (+formatUnits(totalSupply, totalSupplyDecimal))
            token.lpPrice = lpTokenPrice
        } else {
            tokenDetails[i]["lpPrice"] = 0
        }
    }
    return tokenDetails
}

export default async function getLPTokenPrices(
    chain: string,
    timestamp: number = 0
) {
    let detailListOfAddress = await getAllAddressForChain(chain)
    let listOfAddressToGetPriceL2 = detailListOfAddress.map((token) => token.l2CanonicalToken)
    let listOfAddressToGetPriceL1 = detailListOfAddress.map((token) => token.l1CanonicalToken)
    let priceDataforL1 = await getPriceForAllChainAndToken(listOfAddressToGetPriceL1, "ethereum")
    let priceDataforL2 = await getPriceForAllChainAndToken(listOfAddressToGetPriceL2, chain)
    let totalSupply = await getTotalSupplyOfAllL2LpToken(detailListOfAddress, chain)
    let tokenBalance = await getTokenBalanceOfAllL2Swap(totalSupply, chain)
    let finalData = await addPriceToData(tokenBalance, priceDataforL1, priceDataforL2)
    let LPTokenPrice = await calculateLPTokenPrice(finalData)

    const writes: Write[] = [];

    LPTokenPrice.map((chainDetails) => {
        addToDBWritesList(
            writes,
            chain,
            chainDetails.l2SaddleLpToken,
            chainDetails.lpPrice,
            Number(chainDetails.totalSupplyDecimal),
            chainDetails.lpSymbol || "",
            timestamp,
            "hop-protocol",
            1
        )
    })
    return writes
}
