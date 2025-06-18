/**
 * @module csvDataLoader
 * @description Loads and processes data from CSV files for DefiLlama adapters.
 * 
 * CSV File Requirements:
 * - **Global Location**: Must be in root folder of defillama-server repository (e.g., `jito.csv`).
 * - **Naming**: Pass filename without `.csv` extension to `fetchFromCsv` (e.g., 'jito').
 * - **Date Column**: Default: 'date', format 'YYYY-MM-DD HH:MM:SS.sss UTC'. Customizable via `CsvLoaderConfig`.
 * - **Data Columns**: Auto-maps short-forms (df->dailyFees, dv->dailyVolume, etc.) or use custom mappings.
 *   Only present & mapped fields in csv are returned in `FetchResult`.
 *
 * Basic Usage in adapter fetch function:
 * ```typescript
 * import { fetchFromCsv } from "../../../src/utils/csvDataLoader";
 * // ...
 * const fetch = async (options: FetchOptions): Promise<FetchResult> => {
 *   return await fetchFromCsv(options, 'your_csv_filename_without_extension');
 * };
 * ```
 * For custom date formats, pass `CsvLoaderConfig` as the third argument.
 */
import * as fs from 'fs';
import * as path from 'path';
import { FetchOptions, FetchResult } from '../../dimension-adapters/adapters/types';

const GLOBAL_CSV_BASE_PATH = ''; // change if you want to use a different folder

type DateFormat = 'YYYY-MM-DD HH:MM:SS.sss UTC' | 'YYYY-MM-DD';

const DEFAULT_SHORT_FORM_MAPPINGS: Record<string, string> = {
  'date': 'date',
  'df': 'dailyFees',
  'dv': 'dailyVolume',
  'dr': 'dailyRevenue',
  'duf': 'dailyUserFees',
  'dpr': 'dailyProtocolRevenue',
  'dsr': 'dailySupplySideRevenue',
  'dbr': 'dailyBribesRevenue',
  'dhr': 'dailyHoldersRevenue',
  'dtt': 'dailyTokenTaxes'
};

// List of all possible metric fields in a FetchResult
const METRIC_FIELDS = [
  'dailyVolume',
  'dailyFees',
  'dailyRevenue',
  'dailyUserFees',
  'dailyProtocolRevenue',
  'dailySupplySideRevenue',
  'dailyBribesRevenue',
  'dailyHoldersRevenue',
  'dailyTokenTaxes'
] as const;

type MetricField = typeof METRIC_FIELDS[number];

interface CsvRow {
  [key: string]: string | number;
}

interface CsvData {
  dataMap: Map<string, CsvRow[]>;
  header: string[];
}

export interface CsvLoaderConfig {
  dateFormat?: DateFormat;
  filter_column_name?: string;
  filter_column_value?: string | number;
}

const csvCache = new Map<string, CsvData>();

function parseDate(dateValue: string, format: DateFormat): string | null {
  try {
    if (format === 'YYYY-MM-DD HH:MM:SS.sss UTC') {
      const mapKey = dateValue.split(' ')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(mapKey)) {
        throw new Error(`Failed to extract YYYY-MM-DD from "${dateValue}"`);
      }
      return mapKey;
    } else if (format === 'YYYY-MM-DD') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        throw new Error(`Invalid date format. Expected YYYY-MM-DD, got "${dateValue}"`);
      }
      return dateValue;
    }
    throw new Error(`Unsupported dateFormat: "${format}"`);
  } catch (e) {
    return null;
  }
}

function parseCsvContent(csvContent: string, dateColumnName: string, dateFormat: DateFormat): CsvData | null {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return null;

  const header = lines[0].split(',').map(h => h.trim());
  const dateColIndex = header.indexOf(dateColumnName);
  if (dateColIndex === -1) return null;

  const dataMap = new Map<string, CsvRow[]>();

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length !== header.length) continue;

    const originalDateValue = values[dateColIndex].trim();
    const mapKey = parseDate(originalDateValue, dateFormat);
    if (!mapKey) continue;

    const row: CsvRow = {};
    header.forEach((colName, index) => {
      const value = values[index].trim();
      row[colName] = isNaN(Number(value)) || value === '' ? value : Number(value);
    });

    const existingRows = dataMap.get(mapKey);
    if (existingRows) {
      existingRows.push(row);
    } else {
      dataMap.set(mapKey, [row]);
    }
  }

  return { dataMap, header };
}

function loadAndCacheCsv(filePath: string, dateColumnName: string, dateFormat: DateFormat): CsvData | null {
  if (csvCache.has(filePath)) {
    return csvCache.get(filePath)!;
  }

  try {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(path.dirname(path.resolve(path.dirname(path.resolve(process.cwd())))), filePath);
    console.log(absolutePath);
    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    const csvContent = fs.readFileSync(absolutePath, 'utf-8');
    const csvData = parseCsvContent(csvContent, dateColumnName, dateFormat);

    if (csvData) {
      csvCache.set(filePath, csvData);
    }
    return csvData;
  } catch (error: any) {
    return null;
  }
}

function mapCsvDataToResult(
  row: CsvRow,
  header: string[]
): Partial<FetchResult> {
  const mappedData: Record<string, string | number> = {};

  for (const csvColName of header) {
    const adapterFieldName = DEFAULT_SHORT_FORM_MAPPINGS[csvColName.toLowerCase()];
    if (adapterFieldName && row.hasOwnProperty(csvColName)) {
      mappedData[adapterFieldName] = row[csvColName];
    } else if (row.hasOwnProperty(csvColName) && csvColName.toLowerCase() !== 'date') {
      mappedData[csvColName] = row[csvColName];
    }
  }

  const result: Partial<FetchResult> = {};

  // Add all available metrics to the result
  METRIC_FIELDS.forEach(field => {
    if (mappedData[field] !== undefined) {
      result[field] = String(mappedData[field]);
    }
  });

  return result;
}

export async function fetchFromCsv(
  options: FetchOptions,
  csvFilenameWithoutExtension: string,
  loaderConfig?: CsvLoaderConfig
): Promise<FetchResult> {
  const actualFilePath = path.join(GLOBAL_CSV_BASE_PATH, `${csvFilenameWithoutExtension}.csv`);
  const dateFormat = loaderConfig?.dateFormat || 'YYYY-MM-DD HH:MM:SS.sss UTC';
  const dateColumnName = 'date';
  const targetDateStr = new Date(options.startOfDay * 1000).toISOString().split('T')[0];

  const csvData = loadAndCacheCsv(actualFilePath, dateColumnName, dateFormat);

  if (!csvData) {
    throw new Error(`Failed to load CSV data for ${csvFilenameWithoutExtension}.csv on ${targetDateStr}`);
  }

  const { dataMap, header } = csvData;
  const rowsData = dataMap.get(targetDateStr);

  if (!rowsData || rowsData.length === 0) {
    throw new Error(`No data found for date ${targetDateStr} in ${csvFilenameWithoutExtension}.csv`);
  }

  let filteredRows = rowsData;
  
  // Apply filtering if filter parameters are provided and column exists
  if (loaderConfig?.filter_column_name && loaderConfig?.filter_column_value !== undefined) {
    const filterColumnName = loaderConfig.filter_column_name;
    if (header.includes(filterColumnName)) {
      filteredRows = rowsData.filter(row => row[filterColumnName] === loaderConfig.filter_column_value);
    }
  }

  if (filteredRows.length === 0) {
    throw new Error(`No data found after filtering for date ${targetDateStr} in ${csvFilenameWithoutExtension}.csv`);
  }

  const result = mapCsvDataToResult(filteredRows[0], header);

  return result as FetchResult;
}

export function clearCsvCache() {
  csvCache.clear();
}