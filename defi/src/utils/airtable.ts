import fetch from "node-fetch";

export async function getAllAirtableRecords(sheet:string){
  let offset;
  let allRecords = [] as any[];
  do {
    const data: any = await fetch(
      `https://api.airtable.com/v0/${sheet}${offset ? `?offset=${offset}` : ""}`,
      {
        headers: {
          Authorization: process.env.AIRTABLE_API_KEY!,
        },
      }
    ).then((r) => r.json());
    offset = data.offset;
    allRecords = allRecords.concat(data.records);
  } while (offset !== undefined);
  return allRecords
}