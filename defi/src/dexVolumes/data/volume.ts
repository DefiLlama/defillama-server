import { DynamoDB } from "aws-sdk"
import dynamodb from "../../utils/shared/dynamodb"
import type { IRecordVolumeData } from "../handlers/storeDexVolume"
import { formatChain, formatChainKey } from "../utils/getChainsFromDexAdapters"
import removeErrors from "../utils/removeErrors"
import { Item } from "./base"

export enum VolumeType {
    dailyVolume = "dv",
    totalVolume = "tv"
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

    getCleanVolume(chain?: string): Volume | null {
        if (chain !== undefined) {
            if (!this.data[chain] && !this.data[formatChainKey(chain)]) return null
            const data = removeErrors(this.data)
            const newData = {
                [formatChainKey(chain)]: data[chain] ?? data[formatChainKey(chain)]
            }
            if (Volume.isDataEmpty(newData)) return null
            return new Volume(this.type, this.dexId, this.timestamp, newData)
        }
        const d = removeErrors(this.data)
        delete d['eventTimestamp']
        if (Volume.isDataEmpty(d)) return null
        return new Volume(this.type, this.dexId, this.timestamp, d)
    }

    static isDataEmpty(data: IRecordVolumeData) {
        return Object.values(data).filter(d => d !== undefined).length === 0
    }
}

export const storeVolume = async (volume: Volume, eventTimestamp: number): Promise<Volume> => {
    if (Object.entries(volume.data).length === 0) throw new Error(`${volume.type}: Can't store empty volume`)
    const obj2Store: IRecordVolumeData = {
        ...volume.data,
        // @ts-ignore //TODO: fix
        eventTimestamp
    }
    try {
        await dynamodb.update({
            Key: volume.keys(),
            UpdateExpression: createUpdateExpressionFromObj(obj2Store),
            ExpressionAttributeValues: createExpressionAttributeValuesFromObj(obj2Store)
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

export const getVolume = async (dex: string, type: VolumeType, mode: "ALL" | "LAST" | "TIMESTAMP" = "ALL", timestamp?: number): Promise<Volume[] | Volume> => {
    // Creating dummy object to get the correct key
    const volume = new Volume(type, dex, null!, null!)
    let keyConditionExpression = "PK = :pk"
    const expressionAttributeValues: { [key: string]: any } = {
        ":pk": volume.pk,
    }
    if (mode === 'TIMESTAMP') {
        expressionAttributeValues[":sk"] = timestamp
        keyConditionExpression = `${keyConditionExpression} and SK = :sk`
    }
    try {
        const resp = await dynamodb.query({
            // TODO: Change for upsert like
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            Limit: mode === "LAST" ? 1 : undefined,
            ScanIndexForward: mode === "LAST" ? false : true
        })
        if (!resp.Items || resp.Items.length === 0) throw Error(`No items found for ${volume.pk}${timestamp ? ` at ${timestamp}` : ''}`)
        return mode === "LAST" || mode === 'TIMESTAMP' ? Volume.fromItem(resp.Items[0]) : resp.Items.map(Volume.fromItem)
    } catch (error) {
        throw error
    }
}

// TMP: REMOVES ALL VOLUMES, DO NOT USE!
export const removeVolume = async (dex: string, type: VolumeType,): Promise<boolean> => {
    /*     const removeVolumeQuery = async (volume: Volume) => {
            console.log("Removing", volume.keys())
            return dynamodb.delete({
                Key: volume.keys(),
            })
        }
        try {
            const allVolumes = await getVolume(dex, type, "ALL")
            console.log(allVolumes)
            if (!(allVolumes instanceof Array)) throw new Error("Unexpected error deleting volumes")
            const cleanVols = allVolumes.filter(v => v.timestamp * 1000 <= Date.UTC(2020, 8, 7))
            await Promise.all(cleanVols.map(volume => removeVolumeQuery(volume)))
            return true
        } catch (error) {
            console.log(error)
            return false
        } */
    console.info(dex, type)
    return Promise.resolve(false)
}