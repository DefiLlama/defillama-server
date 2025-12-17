import path from 'path';
import { DATA_FILES } from '../constants';
import type { Protocol } from './types';
import parentProtocols from './parentProtocols';

interface ValidationError {
  field: string;
  value: string;
  protocols: string[];
  message: string;
}

interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
}

const GLOBALLY_UNIQUE_FIELDS: (keyof Protocol)[] = [];

const PARENT_SCOPED_UNIQUE_FIELDS: (keyof Protocol)[] = ['twitter', 'url', 'github', 'referralUrl'];

const UNIQUE_WHEN_PRESENT_FIELDS: (keyof Protocol)[] = [];

function normalizeUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .replace(/^www\./, '');
}

function normalizeTwitter(twitter: string | undefined | null): string | null {
  if (!twitter) return null;
  return twitter.toLowerCase().replace(/^@/, '');
}

function normalizeGithub(github: string[] | undefined): string[] | null {
  if (!github || github.length === 0) return null;
  return github.map(g => g.toLowerCase()).sort();
}

function getFieldValue(protocol: Protocol, field: keyof Protocol): string | null {
  const value = protocol[field];

  if (value === null || value === undefined || value === '' || value === '-') {
    return null;
  }

  switch (field) {
    case 'url':
    case 'referralUrl':
      return normalizeUrl(value as string);
    case 'twitter':
      return normalizeTwitter(value as string);
    case 'github':
      const normalized = normalizeGithub(value as string[]);
      return normalized ? normalized.join(',') : null;
    case 'address':
      return (value as string).toLowerCase();
    default:
      return typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase();
  }
}

function loadProtocols(): Protocol[] {
  const allProtocols: Protocol[] = [];

  for (const file of DATA_FILES) {
    const filePath = file.replace('.ts', '');
    const module = require(path.join(__dirname, filePath));
    allProtocols.push(...module.default);
  }

  return allProtocols;
}

function groupProtocolsByParent(protocols: Protocol[]): Map<string, Set<string>> {
  const parentGroups = new Map<string, Set<string>>();

  for (const protocol of protocols) {
    if (protocol.parentProtocol) {
      if (!parentGroups.has(protocol.parentProtocol)) {
        parentGroups.set(protocol.parentProtocol, new Set());
      }
      parentGroups.get(protocol.parentProtocol)!.add(protocol.id);
    }
  }

  return parentGroups;
}

function sharesSameParent(protocol1Id: string, protocol2Id: string, parentGroups: Map<string, Set<string>>): boolean {
  for (const [_, siblings] of parentGroups) {
    if (siblings.has(protocol1Id) && siblings.has(protocol2Id)) {
      return true;
    }
  }
  return false;
}

export function validateProtocolUniqueness(): ValidationResult {
  const protocols = loadProtocols();
  const parentGroups = groupProtocolsByParent(protocols);
  const errors: ValidationError[] = [];

  const valueTracker: Map<string, Map<string, { names: string[], ids: string[] }>> = new Map();

  const allFields = [...GLOBALLY_UNIQUE_FIELDS, ...PARENT_SCOPED_UNIQUE_FIELDS, ...UNIQUE_WHEN_PRESENT_FIELDS];
  for (const field of allFields) {
    valueTracker.set(field, new Map());
  }

  for (const protocol of protocols) {
    for (const field of allFields) {
      const value = getFieldValue(protocol, field);
      if (value === null) continue;

      const tracker = valueTracker.get(field)!;
      if (!tracker.has(value)) {
        tracker.set(value, { names: [], ids: [] });
      }
      tracker.get(value)!.names.push(protocol.name);
      tracker.get(value)!.ids.push(protocol.id);
    }
  }

  for (const field of GLOBALLY_UNIQUE_FIELDS) {
    const tracker = valueTracker.get(field)!;
    for (const [value, { names }] of tracker) {
      if (names.length > 1) {
        errors.push({
          field,
          value,
          protocols: names,
          message: `Duplicate ${field} "${value}" found in protocols: ${names.join(', ')}`
        });
      }
    }
  }

  for (const field of UNIQUE_WHEN_PRESENT_FIELDS) {
    const tracker = valueTracker.get(field)!;
    for (const [value, { names }] of tracker) {
      if (names.length > 1) {
        errors.push({
          field,
          value,
          protocols: names,
          message: `Duplicate ${field} "${value}" found in protocols: ${names.join(', ')}`
        });
      }
    }
  }

  for (const field of PARENT_SCOPED_UNIQUE_FIELDS) {
    const tracker = valueTracker.get(field)!;
    for (const [value, { names, ids }] of tracker) {
      if (names.length > 1) {
        const allSameParent = ids.every((id, _, arr) =>
          arr.every(otherId => id === otherId || sharesSameParent(id, otherId, parentGroups))
        );

        if (!allSameParent) {
          errors.push({
            field,
            value,
            protocols: names,
            message: `Duplicate ${field} "${value}" found in protocols without shared parent: ${names.join(', ')}`
          });
        }
      }
    }
  }

  const parentValueTracker: Map<string, Map<string, string[]>> = new Map();
  const parentFields: (keyof typeof parentProtocols[0])[] = ['name', 'twitter', 'url', 'github'];

  for (const field of parentFields) {
    parentValueTracker.set(field, new Map());
  }

  for (const parent of parentProtocols) {
    for (const field of parentFields) {
      let value: string | null = null;

      if (field === 'github') {
        const normalized = normalizeGithub(parent.github as string[] | undefined);
        value = normalized ? normalized.join(',') : null;
      } else if (field === 'url') {
        value = normalizeUrl(parent.url);
      } else if (field === 'twitter') {
        value = normalizeTwitter(parent.twitter);
      } else {
        const rawValue = parent[field];
        value = rawValue ? String(rawValue).toLowerCase() : null;
      }

      if (value === null) continue;

      const tracker = parentValueTracker.get(field)!;
      if (!tracker.has(value)) {
        tracker.set(value, []);
      }
      tracker.get(value)!.push(parent.name);
    }
  }

  for (const field of parentFields) {
    const tracker = parentValueTracker.get(field)!;
    for (const [value, names] of tracker) {
      if (names.length > 1) {
        errors.push({
          field: `parentProtocol.${field}`,
          value,
          protocols: names,
          message: `Duplicate ${field} "${value}" found in parent protocols: ${names.join(', ')}`
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const strictMode = args.includes('--strict');
  const jsonOutput = args.includes('--json');

  if (!jsonOutput) {
    console.log('Validating protocol uniqueness...\n');
    if (!strictMode) {
      console.log('Running in report mode (use --strict to fail on violations)\n');
    }
  }

  const result = validateProtocolUniqueness();

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : (strictMode ? 1 : 0));
  }

  if (result.success) {
    console.log('All uniqueness checks passed!');
    process.exit(0);
  } else {
    console.error('Uniqueness issues found!\n');

    const errorsByField = new Map<string, ValidationError[]>();
    for (const error of result.errors) {
      if (!errorsByField.has(error.field)) {
        errorsByField.set(error.field, []);
      }
      errorsByField.get(error.field)!.push(error);
    }

    for (const [field, errors] of errorsByField) {
      console.error(`\n=== ${field} duplicates (${errors.length}) ===`);
      for (const error of errors) {
        console.error(`  - ${error.message}`);
      }
    }

    console.error(`\nTotal: ${result.errors.length} uniqueness issue(s) found.`);
    console.error('\nThese protocols share the same field value but do not have a shared parentProtocol.');
    console.error('Consider adding a parentProtocol relationship or fixing the duplicate values.\n');

    if (strictMode) {
      console.error('Strict mode enabled - exiting with error code 1');
      process.exit(1);
    } else {
      console.log('Report mode - exiting with code 0 (use --strict to fail)');
      process.exit(0);
    }
  }
}
