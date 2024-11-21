import axios from "axios";

export async function getAllAirtableRecords(sheet: string) {
  let offset;
  let allRecords = [] as any[];
  if (!process.env.AIRTABLE_API_KEY) throw new Error("Missing AIRTABLE_API_KEY");
  do {
    const { data }: any = await axios.get(
      `https://api.airtable.com/v0/${sheet}${offset ? `?offset=${offset}` : ""}`,
      {
        headers: {
          Authorization: (process.env.AIRTABLE_API_KEY!).replace(/("|')/g, ''),
        },
      }
    )
    if (!data.records){
      console.log("airtable error", data)
      throw new Error('error fetching data from Airtable')
    }
    offset = data.offset;
    allRecords = allRecords.concat(data.records);
  } while (offset !== undefined);
  return allRecords
}