import { getTimestampAtStartOfDayUTC } from "../../utils/date"

const monitorDate = new Date();
monitorDate.setFullYear((new Date()).getFullYear() - 1)
const DAY_IN_MILISECONDS = 86400000

export const getDataPoints = () => {
    const dataPoints = []
    for (let day = 1; day <= 365; day++) {
        const currTimestamp = new Date((monitorDate.getTime() + DAY_IN_MILISECONDS * day) / 1000)
        const start = getTimestampAtStartOfDayUTC(currTimestamp.getTime())
        dataPoints.push(start)
    }
    return dataPoints
}

export default getDataPoints