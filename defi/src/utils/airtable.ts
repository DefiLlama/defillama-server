import axios from "axios";
import sleep from "./shared/sleep";

export async function getAllAirtableRecords(sheet: string) {
  let offset;
  let allRecords = [] as any[];
  if (!process.env.AIRTABLE_API_KEY) throw new Error("Missing AIRTABLE_API_KEY");
  do {
    const { data }: any = await axios.get(
      `https://api.airtable.com/v0/${sheet}${offset ? `?offset=${offset}` : ""}`,
      {
        headers: {
          Authorization: process.env.AIRTABLE_API_KEY!,
        },
      }
    )
    if (!data.records)
      console.log('error fetching data from Airtable', data)
    offset = data.offset;
    allRecords = allRecords.concat(data.records);
    if (offset) await sleep(1000)
  } while (offset !== undefined);
  return allRecords
}