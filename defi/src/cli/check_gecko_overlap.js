// HELPER FUNCTION LOOKS FOR DUPLIATE GECKO_ID BETWEEN DATA1/2/3/4 & parentProtocols
// OUPUTS TO JSON OBJECT- DOESNT MODIFY FILES

// node src/cli/check_gecko_overlap.js

const fs = require('fs');
const path = require('path');

function stripComments(ts) {
  // Remove block comments /* ... */ and line comments // ...
  return ts
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function extractNameGeckoPairs(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const content = stripComments(raw);
  const pairs = [];
  // Find all gecko_id occurrences and capture nearby name
  const geckoRegex = /gecko_id\s*:\s*["']([^"']+)["']/g;
  let match;
  while ((match = geckoRegex.exec(content)) !== null) {
    const geckoId = match[1];
    // Extract the object block that encloses this gecko_id occurrence
    const block = getEnclosingObjectBlock(content, match.index);
    let name = '(unknown)';
    if (block) {
      const obj = content.slice(block.start, block.end);
      const nameMatch = obj.match(/name\s*:\s*["']([^"']+)["']/);
      if (nameMatch) name = nameMatch[1];
    }
    // compute line number
    const before = content.slice(0, match.index);
    const line = before.split('\n').length;
    pairs.push({ name, gecko_id: geckoId, file: filePath, line });
  }
  return pairs;
}

// Attempts to find the start and end indices of the object literal enclosing a given index
function getEnclosingObjectBlock(text, idx) {
  // Find '{' going backwards, tracking brace balance to avoid landing inside nested blocks
  let start = -1;
  let i = idx;
  let braceDepth = 0;
  // Move backward to find the matching '{'
  for (i = idx; i >= 0; i--) {
    const ch = text[i];
    if (ch === '}') braceDepth++;
    else if (ch === '{') {
      if (braceDepth === 0) { start = i; break; }
      braceDepth--;
    }
  }
  if (start === -1) return null;
  // From start, find the matching '}' going forward
  let end = -1;
  braceDepth = 0;
  let inString = false;
  let stringQuote = '';
  for (i = start; i < text.length; i++) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : '';
    if (inString) {
      if (ch === stringQuote && prev !== '\\') inString = false;
      continue;
    }
    if (ch === '"' || ch === '\'') {
      inString = true; stringQuote = ch; continue;
    }
    if (ch === '{') braceDepth++;
    else if (ch === '}') {
      braceDepth--;
      if (braceDepth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) return null;
  return { start, end };
}

const protocolsFiles = ['data1.ts', 'data2.ts', 'data3.ts', 'data4.ts'].map(f => path.join(__dirname, '../protocols', f));
const parentFile = path.join(__dirname, '../protocols/parentProtocols.ts');

const parentPairs = extractNameGeckoPairs(parentFile);
const protocolPairs = protocolsFiles.flatMap(extractNameGeckoPairs);

const parentByGecko = new Map();
for (const p of parentPairs) {
  if (typeof p.gecko_id === 'string') parentByGecko.set(p.gecko_id, p.name);
}

// Build parent vs data overlaps
const parentDataOverlaps = [];
for (const p of protocolPairs) {
  const parentName = parentByGecko.get(p.gecko_id);
  if (parentName) {
    const parentEntry = parentPairs.find(x => x.gecko_id === p.gecko_id);
    parentDataOverlaps.push({
      gecko_id: p.gecko_id,
      protocol: { name: p.name, file: p.file, line: p.line },
      parent: parentEntry ? { name: parentEntry.name, file: parentEntry.file, line: parentEntry.line } : { name: parentName }
    });
  }
}

// Build data vs data overlaps (duplicate gecko_ids across data files)
const byGecko = new Map();
for (const p of protocolPairs) {
  if (!byGecko.has(p.gecko_id)) byGecko.set(p.gecko_id, []);
  byGecko.get(p.gecko_id).push(p);
}
const dataDataOverlaps = [];
for (const [gid, entries] of byGecko.entries()) {
  if (entries.length > 1) {
    dataDataOverlaps.push({
      gecko_id: gid,
      protocols: entries.map(e => ({ name: e.name, file: e.file, line: e.line }))
    });
  }
}

// Optional: auto-fix by removing gecko_id from child protocol files (data1..4)
if (process.env.FIX_CHILD_GECKO === '1' && overlaps.length) {
  const byFile = new Map();
  for (const o of overlaps) {
    const file = o.protocol.file;
    if (!byFile.has(file)) byFile.set(file, new Set());
    byFile.get(file).add(o.gecko_id);
  }
  for (const [file, idSet] of byFile.entries()) {
    let content = fs.readFileSync(file, 'utf8');
    for (const id of idSet) {
      // remove patterns like: gecko_id: "id",
      const patternWithComma = new RegExp(`\\s*gecko_id\\s*:\\s*["']${id}["']\\s*,`, 'g');
      const patternLast = new RegExp(`,?\\s*gecko_id\\s*:\\s*["']${id}["']`, 'g');
      content = content.replace(patternWithComma, '');
      content = content.replace(patternLast, '');
    }
    fs.writeFileSync(file, content);
  }
}

// Prepare compact output
function shortFile(filePath) {
  const base = path.basename(filePath);
  return base; // e.g., data1.ts
}

const compact = {
  parent_data_overlaps: parentDataOverlaps.map(o => ({
    gecko_id: o.gecko_id,
    protocol: { name: o.protocol.name, file: shortFile(o.protocol.file) },
    parent: { name: o.parent.name }
  })),
  data_data_overlaps: dataDataOverlaps.map(item => ({
    gecko_id: item.gecko_id,
    protocols: item.protocols.map(p => ({ name: p.name, file: shortFile(p.file) }))
  }))
};

const outPath = path.join(__dirname, 'temp/gecko_id_overlaps.json');
fs.writeFileSync(outPath, JSON.stringify(compact, null, 2));
console.log(`Written overlaps to ${outPath}. parent_data_overlaps=${compact.parent_data_overlaps.length}, data_data_overlaps=${compact.data_data_overlaps.length}`);


