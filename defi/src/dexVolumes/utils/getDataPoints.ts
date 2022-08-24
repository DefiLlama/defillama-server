const monitorDate = Date.UTC(2019, 9, 11);
const DAY_IN_MILISECONDS = 86400000

export const getDataPoints = () => {
    const limitTime = Date.now() - DAY_IN_MILISECONDS
    const dataPoints = []
    for (let day = monitorDate; day <= limitTime; day += DAY_IN_MILISECONDS)
        dataPoints.push(day / 1000)
    return dataPoints
}

export default getDataPoints