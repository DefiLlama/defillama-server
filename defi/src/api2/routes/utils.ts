import * as HyperExpress from "hyper-express";
import * as sdk from '@defillama/sdk'

function getTimeInFutureMinutes(minutes: number) {
  const date = new Date();
  // add five minutes to the current time
  date.setMinutes(date.getMinutes() + minutes);
  return date.toUTCString()
}

export function successResponse(res: HyperExpress.Response, data: any, cacheMinutes: number) {
  res.setHeaders({
    "Access-Control-Allow-Origin": "*",
    "Expires": getTimeInFutureMinutes(cacheMinutes) // cache for 5 minutes
  })
  res.json(data)
}

export function errorWrapper(routeFn: any) {
  return async (req: HyperExpress.Request, res: HyperExpress.Response) => {
    try {
      await routeFn(req, res)
    } catch (e) {
      sdk.log(e)
      res.status(500)
      return res.send('Internal Error', true)
    }
  }
}