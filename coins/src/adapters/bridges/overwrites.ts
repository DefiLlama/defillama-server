import { getCurrentUnixTimestamp } from '../../utils/date'
import {cgPK} from '../../utils/keys'
// After changing this you need to run cli/writeOverwrites!

const timestamp = getCurrentUnixTimestamp()
export const overwrites = [
    {
        PK: "asset#fantom:0x260b3e40c714ce8196465ec824cd8bb915081812",
        SK: 0,
        created: timestamp,
        redirect: cgPK('iron-finance'), // polygon:0x4a81f8796e0c6ad4877a51c86693b0de8093f2ef
        symbol: "IronICE",
        decimals: 18,
    }
]