const DAY_IN_MILISECONDS = 86400000

export const getDataPoints = (from: number = Date.UTC(2019, 9, 11)) => {
    const monitorDate = from;
    const limitTime = Date.now() - DAY_IN_MILISECONDS
    const dataPoints = []
    for (let day = monitorDate; day <= limitTime; day += DAY_IN_MILISECONDS)
        dataPoints.push(Math.trunc(day / 1000))
    return dataPoints
}

export default getDataPoints