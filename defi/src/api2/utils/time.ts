
const timeSDaysAgoCache: { [days: number]: string } = {}
const getNextTimeSCache: { [timeS: string]: string } = {}
const getTimeSToUnix: { [timeS: string]: number } = {}
const getTimeSToUnixString: { [timeS: string]: string } = {}

export function getTimeSDaysAgo(days: number, moveADayBack = false) { 
  if (moveADayBack) days++
  if (!timeSDaysAgoCache[days]) timeSDaysAgoCache[days] = _getTimeSDaysAgo()
  return timeSDaysAgoCache[days]

  function _getTimeSDaysAgo() {
    const date = new Date();
    date.setDate(date.getDate() - days)
    return dateToTimeS(date);
  }
}

export function dateToTimeS(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based in JavaScript
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNextTimeS(timeS: string) {
  if (!getNextTimeSCache[timeS]) getNextTimeSCache[timeS] = _getNextTimeS()
  return getNextTimeSCache[timeS]

  function _getNextTimeS() {
    const date = new Date(timeS);
    date.setDate(date.getDate() + 1);
    return dateToTimeS(date);
  }
}

export function getUnixTimeNow() {
  return Math.floor(Date.now() / 1000)
}

export function timeSToUnix(timeS: string) {
  if (!getTimeSToUnix[timeS]) getTimeSToUnix[timeS] = Math.floor(new Date(timeS).getTime() / 1000)
  return getTimeSToUnix[timeS]
}

export function timeSToUnixString(timeS: string) {
  if (!getTimeSToUnixString[timeS]) getTimeSToUnixString[timeS] = Math.floor(new Date(timeS).getTime() / 1000).toString()
  return getTimeSToUnixString[timeS]
}

let startOfTodayTime: number
export function getStartOfTodayTime() {
  if (!startOfTodayTime) startOfTodayTime = timeSToUnix(dateToTimeS(new Date()))
  return startOfTodayTime
}