import { getAllAirtableRecords } from "../../utils/airtable";

export async function getTokenRightsInternal() {
  let allRecords = await getAllAirtableRecords("app55W7UltYT3tUHd/Token-Rights");
  return allRecords.map((r) => r.fields);
}
