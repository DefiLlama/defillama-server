import { Protocol } from "../../../../protocols/types"
import openseaCollections from "@defillama/dimension-adapters/helpers/getOpenseaCollections/collections";
import { AdaptorsConfig, IJSON } from "../../types";
import { CollectionInfo, getCollectionInfo, storeCollectionInfo } from "../../../db-utils/collection-info";
import { CHAIN } from "@defillama/dimension-adapters/helpers/chains";
import { CATEGORIES } from "../categories";
import fetch from "node-fetch";

enum MARKETPLACES {
    OPENSEA = 'opensea'
}

const getCollectionList = async (config: AdaptorsConfig): Promise<Protocol[]> => {
    const allCollections = [] as Protocol[]
    // GETOPENSEACOLLECTIONS
    const collectionAddrs = Object.keys(openseaCollections)
    const collections = await getCollectionInfo(MARKETPLACES.OPENSEA).catch(e => console.error(e)) ?? []
    if (collections instanceof Array) {
        const collectionsMap = collections.reduce((acc, curr) => {
            if (curr.body.address)
                acc[curr.body.address] = curr
            return acc
        }, {} as IJSON<CollectionInfo>)
        for (const collectionAddr of collectionAddrs) {
            let collectionInfo: undefined | Protocol = collectionsMap[collectionAddr]?.body
            try {
                if (!collectionInfo) {
                    const response = await fetchCollectionData(openseaCollections[collectionAddr].slug)
                    const infoAPI = response.collection
                    const primaryAssetContract = infoAPI?.primary_asset_contracts?.find(assetContract => {
                        return assetContract.address === collectionAddr
                    })
                    if (!primaryAssetContract) {
                        throw new Error(`No address was found for ${primaryAssetContract}`)
                    }
                    collectionInfo = {
                        id: config[collectionAddr].id,
                        name: infoAPI.name,
                        address: primaryAssetContract.address,
                        category: CATEGORIES.Collection,
                        description: infoAPI.description,
                        symbol: primaryAssetContract.symbol,
                        url: primaryAssetContract.external_link,
                        logo: primaryAssetContract.image_url,
                        cmcId: null,
                        gecko_id: null,
                        chain: CHAIN.ETHEREUM,
                        chains: [CHAIN.ETHEREUM],
                        twitter: infoAPI.twitter_username,
                        module: infoAPI.slug,
                    }
                    await storeCollectionInfo(new CollectionInfo(config[collectionAddr].id, MARKETPLACES.OPENSEA, collectionInfo))
                }
                allCollections.push(collectionInfo)
            } catch (error) {
                console.error(`Unable to get collection info for ${collectionAddr} ${(error as Error)?.message}`, error)
            }
        }
    }
    return allCollections
}


interface CollectionResponse {
    collection: {
        name: string
        twitter_username: string
        slug: string
        description: string
        primary_asset_contracts: Array<{
            address: string
            symbol: string
            image_url: string
            external_link: string
        }>
    }
}
const fetchCollectionData = async (slug: string): Promise<CollectionResponse> => fetch(`https://api.opensea.io/api/v1/collection/${slug}`).then((r) => r.json());

export const getCollectionsMap = async (config: AdaptorsConfig): Promise<IJSON<Protocol>> => {
    const collectionsList = await getCollectionList(config)
    return collectionsList.reduce((acc, curr) => {
        acc[curr.id] = curr
        return acc
    }, {} as IJSON<Protocol>)
}