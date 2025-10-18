import axios, { AxiosRequestConfig } from "axios"
import { sleep } from "./utils"

export default async function fetchURL(url: string, retries = 3) {
  try {
    const res = await httpGet(url)
    return res
  } catch (error) {
    if (retries > 0) return fetchURL(url, retries - 1)
    throw error
  }
}

export async function postURL(url: string, data: any, retries = 3, options?: AxiosRequestConfig) {
  try {
    const res = await httpPost(url, data, options)
    return res
  } catch (error) {
    if (retries > 0) return postURL(url, data, retries - 1, options)
    throw error
  }
}

function formAxiosError(url: string, error: any, options?: any) {
  let e = new Error((error as any)?.message)
  const axiosError = (error as any)?.response?.data?.message || (error as any)?.response?.data?.error || (error as any)?.response?.statusText || (error as any)?.response?.data;
  (e as any).url = url;
  Object.keys(options || {}).forEach((key) => (e as any)[key] = options[key]);
  if (axiosError) (e as any).axiosError = axiosError;
  delete (e as any).stack
  return e
}

const successCodes: number[] = [200, 201, 202, 203, 204, 205, 206, 207, 208, 226];
export async function httpGet(url: string, options?: AxiosRequestConfig, { withMetadata = false } = {}) {
  try {
    const res = await axios.get(url, options)
    if (!successCodes.includes(res.status)) throw new Error(`Error fetching ${url}: ${res.status} ${res.statusText}`)
    if (!res.data) throw new Error(`Error fetching ${url}: no data`)
    if (withMetadata) return res
    return res.data
  } catch (error) {
    throw formAxiosError(url, error, { method: 'GET' })
  }
}

export async function httpPost(url: string, data: any, options?: AxiosRequestConfig, { withMetadata = false } = {}) {
  try {
    const res = await axios.post(url, data, options)
    if (!successCodes.includes(res.status)) throw new Error(`Error fetching ${url}: ${res.status} ${res.statusText}`)
    if (!res.data) throw new Error(`Error fetching ${url}: no data`)
    return res.data
  } catch (error) {
    if (withMetadata) throw error
    throw formAxiosError(url, error, { method: 'POST' })
  }
}

export async function fetchURLAutoHandleRateLimit(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await httpGet(url)
    } catch (error) {
      if (i < retries - 1) {
        await sleep(5000)
      } else {
        throw error
      }
    }
  }
}
