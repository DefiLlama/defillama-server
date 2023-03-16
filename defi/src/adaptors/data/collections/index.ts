import { Protocol } from "../../../protocols/types"
import openseaCollections from "@defillama/dimension-adapters/helpers/getOpenseaCollections/collections";
import { IJSON } from "../types";
import { CollectionInfo, getCollectionInfo, storeCollectionInfo } from "../../db-utils/collection-info";
import { CHAIN } from "@defillama/dimension-adapters/helpers/chains";
import { CATEGORIES } from "../helpers/categories";

enum MARKETPLACES {
    OPENSEA = 'opensea'
}

const getCollectionList = async (): Promise<Protocol[]> => {
    const allCollections = [] as Protocol[]
    // GETOPENSEACOLLECTIONS
    const collectionIds = Object.keys(openseaCollections)
    const collections = await getCollectionInfo(MARKETPLACES.OPENSEA)
    if (collections instanceof Array) {
        const collectionsMap = collections.reduce((acc, curr) => {
            acc[curr.collectionId] = curr
            return acc
        }, {} as IJSON<CollectionInfo>)
        for (const collectionId of collectionIds) {
            let collectionInfo: undefined | Protocol = collectionsMap[collectionId]?.body
            if (!collectionInfo) {
                try {
                    const infoAPI = await fetchCollectionData(openseaCollections[collectionId].slug)
                    const primaryAssetContract = infoAPI?.primary_asset_contracts?.find(assetContract => assetContract.address === collectionId)
                    if (!primaryAssetContract) {
                        throw new Error(`No address was found for ${primaryAssetContract}`)
                    }
                    collectionInfo = {
                        id: `${MARKETPLACES.OPENSEA}#${collectionId}`,
                        name: infoAPI.name,
                        address: infoAPI.primary_asset_contracts[0].address,
                        category: CATEGORIES.Collection,
                        description: infoAPI.description,
                        symbol: infoAPI.primary_asset_contracts[0].symbol,
                        url: infoAPI.primary_asset_contracts[0].external_link,
                        logo: infoAPI.primary_asset_contracts[0].image_url,
                        cmcId: null,
                        gecko_id: null,
                        chain: CHAIN.ETHEREUM,
                        chains: [CHAIN.ETHEREUM],
                        twitter: infoAPI.twitter_username,
                        module: infoAPI.slug,
                    }
                    await storeCollectionInfo(new CollectionInfo(collectionId, MARKETPLACES.OPENSEA, collectionInfo))
                } catch (error) {
                    console.error(`Unable to get collection info for ${collectionId} ${(error as Error)?.message}`, error)
                }
            }
            allCollections.push(collectionInfo)
        }
    }
    return allCollections
}


interface CollectionResponse {
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
const fetchCollectionData = async (slug: string): Promise<CollectionResponse> => fetch(`https://api.opensea.io/api/v1/collection/${slug}`).then((r) => r.json());

export const getCollectionsMap = async (): Promise<IJSON<Protocol>> => {
    const collectionsList = await getCollectionList()
    return collectionsList.reduce((acc, curr) => {
        acc[curr.id] = curr
        return acc
    }, {} as IJSON<Protocol>)
}