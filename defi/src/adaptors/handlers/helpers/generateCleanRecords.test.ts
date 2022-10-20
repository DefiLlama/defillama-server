// import { formatTimestampAsDate } from "../../../utils/date";
import { AdaptorRecord, AdaptorRecordType } from "../../db-utils/adaptor-record";
import generateCleanRecords from "./generateCleanRecords";

const chains = ['ethereum', 'optimism', 'arbitrum', 'polygon']
const protocols = ['v1', 'v2']
const adaptorRecords = [...Array(30).keys()].map(index => {
    const data = (number: number) => {
        let d: any = {
            "ethereum": {
                "v1": number,
            },
            "eventTimestamp": 1662457714,
            "polygon": {
                "v1": number,
            },
            "arbitrum": {
                "v1": number,
            },
        } // default value
        if (index === 5 || index === 6)
            d = {
                "arbitrum": {
                    "v2": number,
                },
            } // multiple gap chains + protocol
        else if (index === 7)
            d = {
                "ethereum": {
                    "error": "Couldn't find block height for chain ethereum, RPC node rugged"
                },
                "eventTimestamp": 1662457714,
                "polygon": {
                    "error": "Couldn't find block height for chain polygon, RPC node rugged"
                },
                "arbitrum": {
                    "error": "Couldn't find block height for chain arbitrum, RPC node rugged"
                }
            } // full error values
        else if (index === 13)
            d = {} // empty values
        else if (index === 25) {
            d['optimism'] = { "v1": 547 } // filter chain
            d['arbitrum'] = { "v2": number } // multiple day gap for v2 + missing v1
        }
        else if (index === 28) {
            d['optimism'] = { "v1": 600 }
        }

        return d
    }
    return new AdaptorRecord(AdaptorRecordType.dailyVolume, "1", Date.UTC(2022, 0, index + 1) / 1000, data(index + index % 7))
})

test("Generate clean records works as expected", async () => {
    const cleanRecords = generateCleanRecords(adaptorRecords, chains, protocols, undefined)
    expect(cleanRecords)
        .toMatchSnapshot()
});

test("Generate clean records by chain works as expected", async () => {
    const cleanRecords = generateCleanRecords(adaptorRecords, chains, protocols, "arbitrum")
    expect(cleanRecords)
        .toMatchSnapshot()
});

//console.log(adaptorRecords)
// /* adaptorRecords.map(ar=>ar.getCleanAdaptorRecord(undefined)).filter(f=>f!==null) as AdaptorRecord[]// */
/* const cleanRecords = generateCleanRecords(adaptorRecords, chains, protocols, undefined)
for (const cr of cleanRecords) {
    console.log(formatTimestampAsDate(String(cr.timestamp)), cr.data)
} */