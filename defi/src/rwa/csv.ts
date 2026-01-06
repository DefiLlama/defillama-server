import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync"; // synchronous parsing

const listColumns = [
    'Chain',
    'Contracts',
    'Category',
    'Asset Class',
    'KYC',
    'Notes',
    'Pool ID'
];

function parseCsv(): any {
    const csvPath = path.join(__dirname, "./5Jan.csv");
    const csv = fs.readFileSync(csvPath, "utf8");
    const rows: any[] = parse(csv, {
        columns: true,  // return objects with headers as keys
        skip_empty_lines: true,
        bom: true,      // handles BOM if present
        trim: true      // trims spaces from cells
      });
      
    return rows;
}

export function getCsvData() {
    const rawCsvData = parseCsv();

    const parsedCsvData = rawCsvData.map((row: any) => {
        Object.keys(row).forEach((key: string) => {
            if (row[key] == '✓') {
                row[key] = true;
            } else if (row[key] == 'x') {
                row[key] = false;
            } else if (row[key].indexOf(";") !== -1) {
                row[key] = row[key].split(";").map((item: string) => item.trim());
            } else if (listColumns.includes(key)) {
                row[key] = [row[key]]
            } else {
                row[key] = row[key].trim();
            }
        });
        return row;
    });

    return parsedCsvData;
}