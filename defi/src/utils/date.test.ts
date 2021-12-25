import {getTimestampAtStartOfDay,getDay, getClosestDayStartTimestamp} from "./date"

test("getTimestampAtStartOfDay", ()=>{
    expect(getTimestampAtStartOfDay(1631772242)).toBe(1631750400)
})

test("getDay", ()=>{
    const start = 1631750400
    for(let ts = start; ts<start+24*3600; ts+3600){
        expect(getDay(ts)).toBe(getDay(start))
    }
    expect(getDay(start+25*3600)).not.toBe(getDay(start))
})

test("getClosestDayStartTimestamp", ()=>{
    expect(getClosestDayStartTimestamp(1631750400-1)).toBe(1631750400)
    expect(getClosestDayStartTimestamp(1631750400+1)).toBe(1631750400)
    expect(getClosestDayStartTimestamp(1631793104)).toBe(1631750400)
})