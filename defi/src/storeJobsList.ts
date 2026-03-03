import { wrapScheduledLambda } from "./utils/shared/wrap";
import { storeR2JSONString } from "./utils/r2";
import fetch from "node-fetch";

const BASE_URL = "https://middleware.jobstash.xyz/public/jobs/list";
const PAGE_LIMIT = 100;

async function fetchPage(page: number): Promise<any> {
  const url = `${BASE_URL}?orderBy=publicationDate&page=${page}&limit=${PAGE_LIMIT}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`JobStash API returned ${res.status}: ${res.statusText}`);
  return res.json();
}

async function fetchAllJobs(): Promise<any[]> {
  const allJobs: any[] = [];

  const firstPage = await fetchPage(1);
  const total: number = firstPage.total;
  allJobs.push(...firstPage.data);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  for (let page = 2; page <= totalPages; page++) {
    const pageData = await fetchPage(page);
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
    await storeR2JSONString("jobslist/jobstash.json", JSON.stringify(allJobs), 24 * 60 * 60);
  } catch (e) {
    console.error("Failed to fetch jobs from JobStash, skipping R2 update:", e);
  }
}

export default wrapScheduledLambda(storeJobsList);
