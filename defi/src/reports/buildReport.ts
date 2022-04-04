import fetch from "node-fetch"
import { draw } from "./chart";

const secret = process.env.FATHOM_SECRET;
const webhookSecret = process.env.DAILY_GROWTH_WEBHOOK;

function getFathomData(options: any) {
    return fetch(`https://api.usefathom.com/v1/aggregations?${Object.entries(options).map(([a, b]) => `${a}=${b}`).join("&")
        }`, {
        headers: {
            "Authorization": `Bearer ${secret}`
        },
    }).then(r => r.json())
}

function formatDate(d: Date) {
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate()
}

function getDayBefore(daysBefore: number) {
    const d = new Date(Date.now() - daysBefore * (3600 * 24 * 1000))
    return formatDate(d)
}

export function getPeriodDailyVisitors(days: number) {
    return getDailyVisitors(getDayBefore(days))
}

export async function getDailyVisitors(dateFrom?: string) {
    const params = {
        entity: "pageview",
        entity_id: "OANJVQNZ",
        aggregates: "visits",
        date_grouping: "day",
        sort_by: "timestamp:asc",
        ...(dateFrom && { date_from: dateFrom })
    }
    const data = await getFathomData(params)
    data.pop() // latest day data is incomplete
    const image = await draw({
        type: 'bar' as any,
        data: {
            datasets: [{
                label: "Daily total visitors",
                data: data.map(({ visits, date }: any) => ({ x: date, y: visits })),
                backgroundColor: "black"
            }]
        }
    })
    await sendChart(image)
}

async function sendChart(image:Buffer){
  return fetch(`https://discord.com/api/webhooks/${webhookSecret}`,
  {
    method: "post",
    body: Buffer.concat([
Buffer.from(`
------boundary
Content-Disposition: form-data; name="files[0]"; filename="file.png"
Content-Type: image/png

`), image, Buffer.from(`
------boundary--
`)]),
    headers:{
        "Content-Type": "multipart/form-data; boundary=----boundary"
    }
  });
}

export async function getMostVisitedPages() {
    const prevDay = getDayBefore(1)
    const params = {
        entity: "pageview",
        entity_id: "OANJVQNZ",
        aggregates: "uniques",
        date_grouping: "day",
        field_grouping: "pathname",
        limit: "30",
        sort_by: "uniques:desc",
        date_from: prevDay,
        date_to: prevDay,
    }
    const data = await getFathomData(params)
    const image = await draw({
        type: 'bar' as any,
        data: {
            datasets: [{
                label: "Daily total visitors",
                data: data.map(({ uniques, pathname }: any) => ({ x: uniques, y: pathname })),
                backgroundColor: "black"
            }]
        },
        options: {
            indexAxis: 'y',
          }
    }, {
        height: 1e3
    })
    await sendChart(image)
}