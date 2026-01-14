import { getAllAirtableRecords } from "../utils/airtable";

const listColumns = ["Chain", "Contracts", "Category", "Asset Class", "KYC", "Notes", "Pool ID"];

export async function getCsvData() {
  const rawCsvData = await getAllAirtableRecords("appv73DKfa5DrNPP0/tblnrNUJzEiXFB5gU");

  const parsedCsvData = rawCsvData.map(({ fields: row }) => {
    Object.keys(row).forEach((key: string) => {
      if (row[key] == "-" || row[key] == "") {
        row[key] = null;
      } else if (row[key] == "✓" || row[key] == true) {
        row[key] = true;
      } else if (row[key] == "x" || row[key] == false) {
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
