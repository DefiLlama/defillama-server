import fetch from "node-fetch";

export async function getAllAirtableRecords(sheet:string){
  let offset;
  let allRecords = [] as any[];
  if (!process.env.AIRTABLE_API_KEY) throw new Error("Missing AIRTABLE_API_KEY");
  console.log(`Fetching process.env.AIRTABLE_API_KEY: ${process.env.AIRTABLE_API_KEY} from Airtable`);
  do {
    const data: any = await fetch(
      `https://api.airtable.com/v0/${sheet}${offset ? `?offset=${offset}` : ""}`,
      {
        headers: {
          Authorization: process.env.AIRTABLE_API_KEY!,
        },
      }
    ).then((r) => r.json());
    console.log(`Fetched data records from Airtable`, data);
    offset = data.offset;
    allRecords = allRecords.concat(data.records);
  } while (offset !== undefined);
  return allRecords
}