import * as HyperExpress from "hyper-express";
import * as sdk from '@defillama/sdk'
import { readRouteData } from "../cache/file-cache";

function getTimeInFutureMinutes(minutes: number) {
  const date = new Date();
  // add five minutes to the current time
  date.setMinutes(date.getMinutes() + minutes);
  return date.toUTCString()
}

export function successResponse(res: HyperExpress.Response, data: any, cacheMinutes: number = 30, {
  isJson = true,
  isPost = false,
} = {}) {
  res.setHeaders({
    "Expires": getTimeInFutureMinutes(cacheMinutes)
  })
  if (isPost)
    res.removeHeader("Expires")

  isJson ? res.json(data) : res.send(data)
}

export function errorResponse(res: HyperExpress.Response, data: any = 'Internal server error', {
  statusCode = 400,
} = {}) {
  res.status(statusCode)
  res.send(data, true)
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


export async function fileResponse(filePath: string, res: HyperExpress.Response) {
  try {
    res.set('Cache-Control', 'public, max-age=600'); // Set caching to 10 minutes
    res.json(await readRouteData(filePath))
  } catch (e) {
    console.error(e);
    return errorResponse(res, 'Internal server error', { statusCode: 500 })
  }
}

export function validateProRequest(req: HyperExpress.Request, res: HyperExpress.Response) {
  if ((req as any).isProRequest) return;

  // throw error if not pro
  res.status(403)
  res.send('Pro access required', true)
  return (req as any).isProRequest === true
}
