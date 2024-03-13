import { DynamoDB } from "aws-sdk"
import dynamodb, { getHistoricalValues } from "../../utils/shared/dynamodb"
import { formatChainKey } from "../utils/getAllChainsFromAdaptors"
import removeErrors from "../utils/removeErrors"
import { Item } from "./base"
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { IJSON, ProtocolAdaptor } from "../data/types"
import dynamoReservedKeywords from "./dynamo-reserved-keywords"

export enum AdaptorRecordType {
    dailyVolume = "dv",
    totalVolume = "tv",
    totalPremiumVolume = "tpv",
    totalNotionalVolume = "tnv",
    dailyPremiumVolume = "dpv",
    dailyNotionalVolume = "dnv",
    tokenIncentives = "ti",
    // fees & revenue
    dailyFees = "df",
    dailyBribesRevenue = "dbr",
    dailyTokenTaxes = "dtt",
    dailyShortOpenInterest = "dsoi",
    dailyLongOpenInterest = "dloi",
    dailyOpenInterest = "doi",
    dailyRevenue = "dr",
    dailyUserFees = "duf",
    dailySupplySideRevenue = "dssr",
    dailyProtocolRevenue = "dpr",
    dailyHoldersRevenue = "dhr",
    dailyCreatorRevenue = "dcr",
    totalFees = "tf",
    totalRevenue = "tr",
    totalUserFees = "tuf",
    totalSupplySideRevenue = "tssr",
    totalProtocolRevenue = "tpr",
    totalHoldersRevenue = "thr",
    totalCreatorRevenue = "tcr"
}

export const AdaptorRecordTypeMap = Object.entries(AdaptorRecordType).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as IJSON<AdaptorRecordType>)
export const AdaptorRecordTypeMapReverse = Object.entries(AdaptorRecordType).reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {} as IJSON<string>)

export interface IRecordAdapterRecordChainData {
    [protocolVersion: string]: number | string | IJSON<string>,
}

export interface IRecordAdaptorRecordData {
    [chain: string]: IRecordAdapterRecordChainData | number
}

export interface RawRecordMap {
    [recordName: string]: IRecordAdaptorRecordData
}

export class AdaptorRecord extends Item {
    data: IRecordAdaptorRecordData
    type: AdaptorRecordType
    adaptorId: string
    timestamp: number
    protocolType: ProtocolType

    constructor(type: AdaptorRecordType, adaptorId: string, timestamp: number, data: IRecordAdaptorRecordData, protocolType: ProtocolType = ProtocolType.PROTOCOL) {
        super()
        this.data = data
        this.type = type
        this.adaptorId = adaptorId
        this.timestamp = timestamp
        this.protocolType = protocolType
    }

    static fromItem(item?: DynamoDB.AttributeMap): AdaptorRecord {
        if (!item) throw new Error("No item!")
        if (!item.PK || !item.SK) throw new Error("Bad item!")
        // PK=dv#{dex}#{id} TODO: set dex?
        // TODO: update dynamodb types with correct sdk
        const recordType = (item.PK as string).split("#")[0] as AdaptorRecordType
        const protocolType = (item.PK as string).split("#")[1] as ProtocolType
        const dexId = (item.PK as string).split("#")[2]
        const body = item as IRecordAdaptorRecordData
        const timestamp = +item.SK
        delete body.PK;
        delete body.SK;
        const clean_body = Object.entries(body).reduce((acc, [key, value]) => {
            acc[revertReservedKeyword(key)] = value
            return acc
        }, {} as IRecordAdaptorRecordData)
        return new AdaptorRecord(recordType, dexId, timestamp, clean_body, protocolType)
    }

    static fromJSON(json: any): AdaptorRecord | AdaptorRecord[] {
        if (Array.isArray(json)) return json.map(i => AdaptorRecord.fromJSON(i)) as AdaptorRecord[]
        let { type, adaptorId, timestamp, data, protocolType } = json
        // data = JSON.parse(JSON.stringify(data)) // deep copy
        return new AdaptorRecord(type, adaptorId, timestamp, data, protocolType)
    }

    get pk(): string {
        if (this.type === AdaptorRecordType.dailyVolume || this.type === AdaptorRecordType.totalVolume)
            return `${this.type}#dex#${this.adaptorId}`
        return `${this.type}#${this.protocolType}#${this.adaptorId}`
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

    getCleanAdaptorRecord(chains?: string[], protocolKey?: string): AdaptorRecord | null {
        let data = this.data
        if (protocolKey)
            data = Object.entries(data).reduce((acc, [chain, value]) => {
                if (typeof value === 'number') return acc
                acc[chain] = {
                    [protocolKey]: value[protocolKey]
                }
                return acc
            }, {} as IRecordAdaptorRecordData)
        if (chains !== undefined && chains.length > 0) {
            //if (!this.data[chain] && !this.data[formatChainKey(chain)]) return null
            data = chains.reduce((acc, chain) => {
                acc[formatChainKey(chain)] = data[chain] ?? data[formatChainKey(chain)]
                return acc
            }, {} as IJSON<number | IRecordAdapterRecordChainData>)
        }
        const newDataNoErr = removeErrors(data)
        if (AdaptorRecord.isDataEmpty(newDataNoErr)) return null
        return new AdaptorRecord(this.type, this.adaptorId, this.timestamp, newDataNoErr, this.protocolType)
    }

    static isDataEmpty(data: IRecordAdaptorRecordData) {
        return Object.keys(Object.entries(data).reduce((acc, [chain, value]) => {
            if (typeof value === 'number' || value === undefined) return acc
            const valueNew = Object.entries(value).reduce((ac, [prot, val]) => {
                if (!Number.isNaN(val))
                    ac[prot] = val
                return ac
            }, {} as IRecordAdapterRecordChainData)
            if (Object.keys(valueNew).length > 0)
                acc[chain] = valueNew
            return acc
        }, {} as IRecordAdaptorRecordData)).length === 0
    }
}

export const storeAdaptorRecord = async (adaptorRecord: AdaptorRecord, eventTimestamp: number): Promise<AdaptorRecord> => {
    if (Object.entries(adaptorRecord.data).length === 0) throw new Error(`${adaptorRecord.type}: Can't store empty adaptor record`)

    // Proceed to remove previous errors
    const obj2Store: IRecordAdaptorRecordData = {
        ...Object.entries(adaptorRecord.data).reduce((acc, [chain, data]) => {
            const currentChainValue = acc[chain]
            const clean_chain = replaceReservedKeyword(chain)
            if (typeof data === 'number' || typeof currentChainValue === 'number' || chain === 'error') return acc
            if (currentChainValue && Object.keys(currentChainValue).length === 0) return acc
            acc[clean_chain] = { ...currentChainValue, ...data, }
            return acc
        }, {} as IRecordAdaptorRecordData), eventTimestamp
    }

    adaptorRecord.data = obj2Store
    const record = adaptorRecord.getCleanAdaptorRecord()

    if (record) {
        const recordWithTimestamp = { ...record.toItem(), eventTimestamp };
        await dynamodb.put(recordWithTimestamp)
    }
    return adaptorRecord
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

export type GetAdaptorRecordOptions = {
    adapter: ProtocolAdaptor,
    type: AdaptorRecordType,
    adaptorType?: AdapterType,
    timestamp?: number,
    lastKey?: number,
    mode?: "ALL" | "LAST" | "TIMESTAMP"
}

export async function getAdaptorRecord2({ adapter, type, timestamp, mode = 'ALL', lastKey, }: GetAdaptorRecordOptions): Promise<AdaptorRecord[] | AdaptorRecord> {
    const adaptorId = adapter.id
    const protocolType = adapter.protocolType
    return getAdaptorRecord(adaptorId, type, protocolType, mode, timestamp, lastKey)
}

export const getAdaptorRecord = async (adaptorId: string, type: AdaptorRecordType, protocolType?: ProtocolType, mode: "ALL" | "LAST" | "TIMESTAMP" = "ALL", timestamp?: number, lastKey?: number): Promise<AdaptorRecord[] | AdaptorRecord> => {
    // Creating dummy object to get the correct key
    const adaptorRecord = new AdaptorRecord(type, adaptorId, null!, null!, protocolType)
    let keyConditionExpression = "PK = :pk"
    const expressionAttributeValues: { [key: string]: any } = {
        ":pk": adaptorRecord.pk,
    }
    if (mode === 'TIMESTAMP') {
        expressionAttributeValues[":sk"] = timestamp
        keyConditionExpression = `${keyConditionExpression} and SK = :sk`
    } else if (mode === 'ALL' && lastKey !== undefined) {
        expressionAttributeValues[":sk"] = lastKey
        keyConditionExpression = `${keyConditionExpression} and SK > :sk`
    } else if (mode === 'ALL' && timestamp !== undefined) {
        expressionAttributeValues[":sk"] = timestamp
        keyConditionExpression = `${keyConditionExpression} and SK <= :sk`
    }
    let resp: any
    let moreThanAWeekAway = !lastKey || lastKey < (Date.now() / 1e3) - 7 * 24 * 60 * 60
    let getAllValues = mode === "ALL" && moreThanAWeekAway && !timestamp

    if (getAllValues) {
        resp = await getHistoricalValues(adaptorRecord.pk, lastKey)
    } else {
        resp = await dynamodb.query({
            // TODO: Change for upsert like
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            Limit: mode === "LAST" ? 1 : undefined,
            ScanIndexForward: mode === "LAST" ? false : true
        })

    }
    if (!resp || resp.length === 0) throw Error(`No items found for ${adaptorRecord.pk}${timestamp ? ` at ${timestamp}` : ''}`)
    return mode === "LAST" || mode === 'TIMESTAMP' ? AdaptorRecord.fromItem(resp.Items[0]) : Object.keys(resp).includes('Items') ? resp.Items.map(AdaptorRecord.fromItem) : resp.map(AdaptorRecord.fromItem)
}

// REMOVES ALL VOLUMES, DO NOT USE!
export const removeAdaptorRecord = async (adaptorId: string, type: AdaptorRecordType, protocolType: ProtocolType): Promise<boolean> => {
    /* try {
        const allAdaptorRecords = await getAdaptorRecord(adaptorId, type, protocolType, "ALL")
        if (!(allAdaptorRecords instanceof Array)) throw new Error("Unexpected error deleting adaptor records")
        const cleanAdaptorRecs = allAdaptorRecords// .filter(v => v.timestamp * 1000 <= Date.UTC(2020, 8, 7))
        await Promise.all(cleanAdaptorRecs.map(adaptorRecord => removeAdaptorRecordQuery(adaptorRecord)))
        return true
    } catch (error) {
        console.log(error)
        return false
    } */
    console.log(adaptorId, type, protocolType)
    return Promise.resolve(false)
}

export const removeAdaptorRecordQuery = async (adaptorRecord: AdaptorRecord) => {
    console.log("Removing", adaptorRecord.keys())
    return dynamodb.delete({
        Key: adaptorRecord.keys(),
    })
}
