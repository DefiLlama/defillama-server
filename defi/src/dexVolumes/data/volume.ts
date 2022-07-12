import { DynamoDB } from "aws-sdk"
import dynamodb from "../../utils/shared/dynamodb"
import type { IRecordVolumeData } from "../storeDexVolume"
import { Item } from "./base"

export enum VolumeType {
    dailyVolume = "dv"
}

export class Volume extends Item {
    data: IRecordVolumeData
    type: VolumeType
    dexId: string
    timestamp: number
    version: string | undefined

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
        const body = item
        const timestamp = +item.SK
        delete body.PK;
        delete body.SK;
        return new Volume(recordType, dexId, timestamp, body as IRecordVolumeData)
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
    try {
        await dynamodb.put(
            volume.toItem(),
            { ConditionExpression: 'attribute_not_exists(SK)' } // To avoid update existing entry. TODO: change
        )
        return volume
    } catch (error) {
        throw error
    }
}

export const getVolume = async (dex: string, type: VolumeType): Promise<Volume[]> => {
    // Creating dummy object to get the correct key
    const volume = new Volume(type, dex, null!, null!)

    try {
        const resp = await dynamodb.query({
            // TODO: Change for upsert like
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: {
                ":pk": volume.pk,
            }
        })
        console.log("items", resp, volume.pk)
        if (!resp.Items) throw Error("No items found")
        return resp.Items.map(Volume.fromItem)
    } catch (error) {
        throw error
    }
}