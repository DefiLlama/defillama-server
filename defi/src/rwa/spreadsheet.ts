import { getAllAirtableRecords } from "../utils/airtable";
import { RWA_KEY_MAP } from "./metadataConstants";

const listColumns: string[] = ["Chain", "Contracts", "Category", "Asset Class", "KYC", "Notes", "Pool ID"];

function deepTrimStrings(value: any): any {
  if (value == null) return value;
  if (typeof value === "string") {
    const s = value.trim();
    return s === "" ? null : s;
  }
  if (Array.isArray(value)) {
    return value.map(deepTrimStrings).filter((v) => v != null);
  }
  if (typeof value === "object") {
    const out: any = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value)) out[k] = deepTrimStrings(v);
    return out;
  }
  return value;
}

// Get CSV data from Airtable
export async function getCsvData(): Promise<Object[]> {
  const rawCsvData = await getAllAirtableRecords("appv73DKfa5DrNPP0/tblnrNUJzEiXFB5gU");

  const parsedCsvData: Object[] = rawCsvData.map(({ fields: row }) => {
    Object.keys(row).forEach((key: string) => {
      const raw = deepTrimStrings(row[key]);
      row[key] = raw;

      if (raw === "-" || raw === "") {
        row[key] = null;
        return;
      }

      if (key === RWA_KEY_MAP.id && raw === "1") {
        row[key] = "1";
        return;
      }

      // Booleans (Airtable may return ✓/x or strings)
      if (raw === true) return;
      if (raw === false) return;
      if (raw === "✓") {
        row[key] = true;
        return;
      }
      if (raw === "x") {
        row[key] = false;
        return;
      }
      if (typeof raw === "string") {
        const lower = raw.toLowerCase();
        if (lower === "true") {
          row[key] = true;
          return;
        }
        if (lower === "false") {
          row[key] = false;
          return;
        }

        // Semicolon list
        if (raw.includes(";")) {
          row[key] = raw.split(";").map((item: string) => item.trim()).filter(Boolean);
          return;
        }
      }

      // Force list columns into arrays (avoid nested arrays)
      if (listColumns.includes(key)) {
        if (raw == null) row[key] = [];
        else row[key] = Array.isArray(raw) ? raw : [raw];
        return;
      }
    });
    return row;
  });

  return parsedCsvData;
}
