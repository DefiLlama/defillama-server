import { getAllAirtableRecords } from "../utils/airtable";
import { keyMap } from "./constants";

const listColumns: string[] = ["Chain", "Contracts", "Category", "Asset Class", "KYC", "Notes", "Pool ID"];

// Get CSV data from Airtable
export async function getCsvData(): Promise<Object[]> {
  const rawCsvData = await getAllAirtableRecords("appv73DKfa5DrNPP0/rwa");

  const parsedCsvData: Object[] = rawCsvData.map(({ fields: row }) => {
    Object.keys(row).forEach((key: string) => {
      if (row[key] == "-" || row[key] == "") {
        row[key] = null;
      } else if (key == keyMap.id && row[key] == '1') {
        row[key] = '1'
      } else if (row[key] == "✓" || row[key] == true || row[key].toLowerCase() == 'true') {
        row[key] = true;
      } else if (row[key] == "x" || row[key] == false || row[key].toLowerCase() == 'false') {
        row[key] = false;
      } else if (row[key].indexOf(";") !== -1) {
        row[key] = row[key].split(";").map((item: string) => item.trim());
      } else if (listColumns.includes(key)) {
        row[key] = [row[key]];
      } else {
        row[key] = row[key].trim();
      }
    });
    return row;
  });

  return parsedCsvData;
}
