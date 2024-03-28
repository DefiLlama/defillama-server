export function unixTSToDateString(unixTimestamp: number) {
  return unixTSToHourString(unixTimestamp).slice(0, 10)
}

export function unixTSToHourString(unixTimestamp: number) {
  const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds

  date.setUTCHours(date.getUTCHours()); // Ensure the hour component is in UTC

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}`
}

export function getTimestampString(unixTimestamp: number, hourly?: boolean) {
  return hourly ? unixTSToHourString(unixTimestamp) : unixTSToDateString(unixTimestamp)
}


export function transformDDBToPGFormat(item: any, hourly?: boolean) {
  const { PK, SK, ...rest } = item
  const ts = parseInt(SK)
  return {
    data: rest,
    id: PK.slice(PK.indexOf('#') + 1),
    timestamp: ts,
    timeS: getTimestampString(ts, hourly)
  }
}

export function mergeSortAndRemoveDups(arr: any[] | undefined, arr2: any[] | undefined) {
  if (!arr) arr = []
  if (!arr2) arr2 = []
  const merged = [...arr, ...arr2]
  const sorted = merged.sort((a, b) => a.SK - b.SK)
  const deduped = []
  let last: any = null
  for (const item of sorted) {
    if (last === null || last.SK !== item.SK) {
      deduped.push(item)
      last = item
    }
  }
  return deduped
}