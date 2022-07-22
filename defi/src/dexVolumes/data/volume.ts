import { DynamoDB } from "aws-sdk"
import dynamodb from "../../utils/shared/dynamodb"
import type { IRecordVolumeData } from "../handlers/storeDexVolume"
import { Item } from "./base"

export enum VolumeType {
    dailyVolume = "dv"
}

export class Volume extends Item {
    data: IRecordVolumeData
    type: VolumeType
    dexId: string
    timestamp: number

    constructor(type: VolumeType, dexId: string, timestamp: number, data: IRecordVolumeData) {
        super()
        this.data = data
        this.type = type
        this.dexId = dexId
        this.timestamp = timestamp
    }

    static fromItem(item?: DynamoDB.AttributeMap): Volume {
        if (!item) throw new Error("No item!")
        if (!item.PK || !item.SK) throw new Error("Bad item!")
        // PK=dv#dex#{id}
        // TODO: update dynamodb types with correct sdk
        const dexId = (item.PK as string).split("#")[2]
        const recordType = (item.PK as string).split("#")[0] as VolumeType
        const body = item as IRecordVolumeData
        const timestamp = +item.SK
        delete body.PK;
        delete body.SK;
        return new Volume(recordType, dexId, timestamp, body)
    }

    get pk(): string {
        return `${this.type}#dex#${this.dexId}`
    }

    get sk(): number {
        return this.timestamp
    }

    toItem(): Record<string, unknown> {
        return {
            ...this.keys(),
            ...this.data
        }
    }
}

export const storeVolume = async (volume: Volume): Promise<Volume> => {
    if (Object.entries(volume.data).length === 0) throw new Error("Can't store empty volume")
    try {
        console.log(volume.keys())
        await dynamodb.update({
            Key: volume.keys(),
            UpdateExpression: createUpdateExpressionFromObj(volume.data),
            ExpressionAttributeValues: createExpressionAttributeValuesFromObj(volume.data)
        }) // Upsert like
        return volume
    } catch (error) {
        throw error
    }
}

function createUpdateExpressionFromObj(obj: IRecordVolumeData): string {
    return `set ${Object.keys(obj).map(field => `${field}=:${field}`).join(',')}`
}

function createExpressionAttributeValuesFromObj(obj: IRecordVolumeData): Record<string, unknown> {
    return Object.entries(obj).reduce((acc, [key, value]) => {
        return {
            ...acc,
            [`:${key}`]: value
        }
    }, {} as Record<string, unknown>)
}

export const getVolume = async (dex: string, type: VolumeType, mode: "ALL" | "LAST" = "ALL"): Promise<Volume[] | Volume> => {
    // Creating dummy object to get the correct key
    const volume = new Volume(type, dex, null!, null!)
    try {
        const resp = await dynamodb.query({
            // TODO: Change for upsert like
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: {
                ":pk": volume.pk,
            },
            Limit: mode === "LAST" ? 1 : undefined,
            ScanIndexForward: mode === "LAST" ? false : undefined
        })
        if (!resp.Items || resp.Items.length === 0) throw Error(`No items found for ${volume.pk}`)
        return mode === "LAST" ? Volume.fromItem(resp.Items[0]) : resp.Items.map(Volume.fromItem)
    } catch (error) {
        throw error
    }
}