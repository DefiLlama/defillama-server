import {getTimestampAtStartOfDay, getClosestDayStartTimestamp, getTimestampAtStartOfMonth, getTimestampAtStartOfQuarter} from "./date"

test("getTimestampAtStartOfDay", ()=>{
    expect(getTimestampAtStartOfDay(1631772242)).toBe(1631750400)
})

// test("getDay", ()=>{
//     const start = 1631750400
//     for(let ts = start; ts<start+24*3600; ts+3600){
//         expect(getDay(ts)).toBe(getDay(start))
//     }
//     expect(getDay(start+25*3600)).not.toBe(getDay(start))
// })

test("getClosestDayStartTimestamp", ()=>{
    expect(getClosestDayStartTimestamp(1631750400-1)).toBe(1631750400)
    expect(getClosestDayStartTimestamp(1631750400+1)).toBe(1631750400)
    expect(getClosestDayStartTimestamp(1631793104)).toBe(1631750400)
})

test("getTimestampAtStartOfMonth", ()=>{
    expect(getTimestampAtStartOfMonth(1768867200)).toBe(1767225600)
    expect(getTimestampAtStartOfMonth(1769817600+1)).toBe(1767225600)
    expect(getTimestampAtStartOfMonth(1769817600-1)).toBe(1767225600)
})

test("getTimestampAtStartOfQuarter", () => {
    // Q1
    expect(getTimestampAtStartOfQuarter(1769817600+1)).toBe(1767225600)
    expect(getTimestampAtStartOfQuarter(1769904000+1)).toBe(1767225600)
    expect(getTimestampAtStartOfQuarter(1772323200+1)).toBe(1767225600)

    // Q2
    expect(getTimestampAtStartOfQuarter(1775001600+1)).toBe(1775001600)
    expect(getTimestampAtStartOfQuarter(1777593600+1)).toBe(1775001600)
    expect(getTimestampAtStartOfQuarter(1780272000+1)).toBe(1775001600)
  
    // Q3
    expect(getTimestampAtStartOfQuarter(1782864000+1)).toBe(1782864000)
    expect(getTimestampAtStartOfQuarter(1785542400+1)).toBe(1782864000)
    expect(getTimestampAtStartOfQuarter(1788220800+1)).toBe(1782864000)

    // Q4
    expect(getTimestampAtStartOfQuarter(1790812800+1)).toBe(1790812800)
    expect(getTimestampAtStartOfQuarter(1793491200+1)).toBe(1790812800)
    expect(getTimestampAtStartOfQuarter(1796083200+1)).toBe(1790812800)
})
