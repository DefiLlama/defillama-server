import { DynamoDB } from "aws-sdk"
import dynamodb from "../../utils/shared/dynamodb"
import { Item } from "./base"
import { IJSON } from "../data/types"
import dynamoReservedKeywords from "./dynamo-reserved-keywords"
import { Protocol } from "../../protocols/types"

type CollectionInfoBody = Protocol & { PK?: string, SK?: string }

export class CollectionInfo extends Item<string, string> {
    collectionId: string
    marketplace: string
    body: Protocol

    constructor(collectionId: string, marketplace: string, body: Protocol) {
        super()
        this.collectionId = collectionId
        this.marketplace = marketplace
        this.body = body
    }

    static fromItem(item?: DynamoDB.AttributeMap): CollectionInfo {
        if (!item) throw new Error("No item!")
        if (!item.PK || !item.SK) throw new Error("Bad item!")
        // PK=dv#{dex}#{id} TODO: set dex?
        // TODO: update dynamodb types with correct sdk
        const marketplace = (item.PK as string).split("#")[1] as string
        const collectionId = item.SK as string
        const body = item as unknown as CollectionInfoBody
        delete body.PK;
        delete body.SK;
        const clean_body = Object.entries(body).reduce((acc, [key, value]) => {
            acc[revertReservedKeyword(key)] = value
            return acc
        }, {} as IJSON<any>) as Protocol
        return new CollectionInfo(collectionId, marketplace, clean_body)
    }

    get pk(): string {
        return `info#collections#${this.marketplace}`
    }

    get sk(): string {
        return this.collectionId
    }

    toItem(): Record<string, unknown> {
        return {
            ...this.keys(),
            ...this.body
        }
    }

}

export const storeCollectionInfo = async (collectionInfo: CollectionInfo): Promise<CollectionInfo> => {
    const obj2Store: Protocol = {
        ...Object.entries(collectionInfo.body).reduce((acc, [attrName, value]) => {
            acc[replaceReservedKeyword(attrName)] = value
            return acc
        }, {} as IJSON<any>) as Protocol
    }
    try {
        console.log("Storing", collectionInfo, obj2Store, collectionInfo.keys())
        await dynamodb.update({
            Key: collectionInfo.keys(),
            UpdateExpression: createUpdateExpressionFromObj(obj2Store),
            ExpressionAttributeValues: createExpressionAttributeValuesFromObj(obj2Store)
        }) // Upsert like
        return collectionInfo
    } catch (error) {
        throw error
    }
}

const normalizeSuffix = "_key"
function replaceReservedKeyword(key: string) {
    if (dynamoReservedKeywords.includes(key.toUpperCase())) return `${key}${normalizeSuffix}`
    return key
}
function revertReservedKeyword(key: string) {
    if (key.includes(normalizeSuffix))
        return key.slice(0, -normalizeSuffix.length)
    return key
}

function createUpdateExpressionFromObj(obj: Protocol): string {
    return `set ${Object.keys(obj).map(field => `${field}=:${field}`).join(',')}`
}

function createExpressionAttributeValuesFromObj(obj: Protocol): Record<string, unknown> {
    return Object.entries(obj).reduce((acc, [key, value]) => {
        return {
            ...acc,
            [`:${key}`]: value
        }
    }, {} as Record<string, unknown>)
}

export const getCollectionInfo = async (marketplace: string, collectionId?: string, mode: "ALL" | "SINGLE" = "ALL"): Promise<CollectionInfo[] | CollectionInfo> => {
    // Creating dummy object to get the correct key
    const collectionInfo = new CollectionInfo(collectionId!, marketplace, null!)
    let keyConditionExpression = "PK = :pk"
    const expressionAttributeValues: { [key: string]: any } = {
        ":pk": collectionInfo.pk,
    }
    if (mode === 'SINGLE') {
        expressionAttributeValues[":sk"] = collectionId
        keyConditionExpression = `${keyConditionExpression} and SK = :sk`
    }
    try {
        const resp = await dynamodb.query({
            // TODO: Change for upsert like
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues
        })
        if (!resp.Items || resp.Items.length === 0) throw Error(`No items found for ${collectionInfo.pk}, ${collectionInfo.sk}`)
        return mode === 'SINGLE' ? CollectionInfo.fromItem(resp.Items[0]) : resp.Items.map(CollectionInfo.fromItem)
    } catch (error) {
        throw error
    }
}