import { storeR2JSONString } from "../utils/r2";
import fetch from "node-fetch";
import * as sdk from "@defillama/sdk";

const BASE_URL = "https://middleware.jobstash.xyz/public/jobs/list";
const PAGE_LIMIT = 100;
const TIMEOUT_MS = 15_000;

async function fetchPage(page: number): Promise<any> {
  const url = `${BASE_URL}?orderBy=publicationDate&page=${page}&limit=${PAGE_LIMIT}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal as any });
    if (!res.ok) throw new Error(`JobStash API returned ${res.status}: ${res.statusText}`);
    return res.json();
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error(`JobStash API request timed out after ${TIMEOUT_MS}ms (page ${page})`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAllJobs(): Promise<any[]> {
  const allJobs: any[] = [];

  const firstPage = await fetchPage(1);
  if (!firstPage || typeof firstPage !== "object") throw new Error("JobStash API returned invalid response for page 1");
  if (typeof firstPage.total !== "number") throw new Error(`JobStash API missing numeric total, got: ${typeof firstPage.total}`);

  const total: number = firstPage.total;
  if (!Array.isArray(firstPage.data)) throw new Error(`JobStash API page 1 .data is not an array, got: ${typeof firstPage.data}`);
  allJobs.push(...firstPage.data);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  for (let page = 2; page <= totalPages; page++) {
    console.log(`Fetching JobStash API page ${page}/${totalPages}...`);
    await sdk.util.sleep(3100); // brief pause to avoid overwhelming the API

    const pageData = await fetchPage(page);
    if (!pageData || !Array.isArray(pageData.data)) throw new Error(`JobStash API page ${page} returned invalid .data: ${typeof pageData?.data}`);
    allJobs.push(...pageData.data);
  }

  return allJobs;
}

async function storeJobsList() {
  try {
    const allJobs = await fetchAllJobs();

    if (!allJobs.length) {
      console.log("JobStash API returned empty results, skipping R2 update");
      return;
    }

    console.log(`Fetched ${allJobs.length} jobs from JobStash, storing to R2`);
    await storeR2JSONString("jobslist/jobstash.json", JSON.stringify({
      data: allJobs,
      updatedAt: new Date().toISOString(),
    }), 24 * 60 * 60);
  } catch (e) {
    console.error("Failed to fetch jobs from JobStash, skipping R2 update:", e);
  }
}

storeJobsList().then(() => {
  console.log("storeJobsList completed successfully");
  process.exit(0);
}).catch(e => {
  console.error("Unexpected error in storeJobsList:", e);
  process.exit(1);
})