/**
 * Preview all RWA perps platform adapters.
 *
 * Calls every registered adapter's `fetchMarkets()` against live APIs,
 * then generates a self-contained HTML dashboard at ./adapter-preview.html.
 *
 * Usage:
 *   npx ts-node defi/src/rwa/perps/cli/previewAdapters.ts
 */

import { getAllAdaptersIncludingUnpublished } from "../platforms";
import type { ParsedPerpsMarket } from "../platforms/types";
import fs from "fs";
import path from "path";

interface AdapterResult {
  name: string;
  markets: ParsedPerpsMarket[];
  error: string | null;
  durationMs: number;
}

async function main() {
  const adapters = getAllAdaptersIncludingUnpublished();
  console.log(`Running ${adapters.length} adapters: ${adapters.map((a) => a.name).join(", ")}\n`);

  const results: AdapterResult[] = [];

  await Promise.all(
    adapters.map(async (adapter) => {
      const start = Date.now();
      try {
        console.log(`  ⏳ ${adapter.name} ...`);
        const markets = await adapter.fetchMarkets();
        const dur = Date.now() - start;
        console.log(`  ✅ ${adapter.name}: ${markets.length} markets (${dur}ms)`);
        results.push({ name: adapter.name, markets, error: null, durationMs: dur });
      } catch (e: any) {
        const dur = Date.now() - start;
        console.log(`  ❌ ${adapter.name}: ${e.message} (${dur}ms)`);
        results.push({ name: adapter.name, markets: [], error: e.message, durationMs: dur });
      }
    })
  );

  // Sort by name for consistent ordering
  results.sort((a, b) => a.name.localeCompare(b.name));

  const html = generateHTML(results);
  const outPath = path.join(__dirname, "adapter-preview.html");
  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`\nPreview written to ${outPath}`);

  // Try to open in default browser
  try {
    const { exec } = require("child_process");
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${cmd} "${outPath}"`);
  } catch {}
}

// ---------------------------------------------------------------------------
// HTML generator
// ---------------------------------------------------------------------------

function esc(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtNum(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(decimals);
}

function fmtUSD(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "$0";
  return "$" + fmtNum(n);
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + n.toFixed(4) + "%";
}

function generateHTML(results: AdapterResult[]): string {
  const allMarkets = results.flatMap((r) => r.markets);
  const totalOI = allMarkets.reduce((s, m) => s + m.openInterest, 0);
  const totalVol = allMarkets.reduce((s, m) => s + m.volume24h, 0);
  const ts = new Date().toISOString();

  // Data quality checks — only flag actionable data errors, not empty markets
  const issues: string[] = [];
  let inactiveCount = 0;
  for (const m of allMarkets) {
    if (m.markPx === 0) issues.push(`${m.contract}: price is 0`);
    if (!m.contract) issues.push(`(${m.platform}/${m.venue}): empty contract ID`);
    if (m.markPx < 0) issues.push(`${m.contract}: negative price ${m.markPx}`);
    if (m.openInterest < 0) issues.push(`${m.contract}: negative OI ${m.openInterest}`);
    if (m.openInterest === 0 && m.volume24h === 0) inactiveCount++;
  }

  // Deduplicate contracts across platforms
  const contractCounts = new Map<string, number>();
  for (const m of allMarkets) {
    contractCounts.set(m.contract, (contractCounts.get(m.contract) ?? 0) + 1);
  }
  const dupes = [...contractCounts.entries()].filter(([, c]) => c > 1);
  for (const [contract, count] of dupes) {
    issues.push(`${contract}: duplicate canonical ID (appears ${count}x)`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>RWA Perps Adapter Preview</title>
<style>
  :root {
    --bg: #0d1117; --bg2: #161b22; --bg3: #21262d;
    --fg: #c9d1d9; --fg2: #8b949e; --fg3: #484f58;
    --accent: #58a6ff; --green: #3fb950; --red: #f85149;
    --yellow: #d29922; --border: #30363d;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: var(--bg); color: var(--fg); line-height: 1.5; padding: 20px; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  h2 { font-size: 1.1rem; color: var(--accent); margin: 24px 0 12px; }
  .subtitle { color: var(--fg2); font-size: 0.85rem; margin-bottom: 20px; }
  .cards { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
  .card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px;
    padding: 16px; min-width: 200px; flex: 1; }
  .card-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--fg2); margin-bottom: 4px; }
  .card-value { font-size: 1.5rem; font-weight: 600; }
  .card-sub { font-size: 0.8rem; color: var(--fg2); margin-top: 2px; }
  .platform-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .pcard { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 14px; }
  .pcard.error { border-color: var(--red); }
  .pcard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .pcard-name { font-weight: 600; font-size: 1rem; }
  .badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
  .badge-ok { background: rgba(63,185,80,0.15); color: var(--green); }
  .badge-err { background: rgba(248,81,73,0.15); color: var(--red); }
  .badge-empty { background: rgba(210,153,34,0.15); color: var(--yellow); }
  .pcard-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 0.8rem; }
  .pcard-stats dt { color: var(--fg2); }
  .pcard-stats dd { text-align: right; font-variant-numeric: tabular-nums; }
  .pcard-error { color: var(--red); font-size: 0.8rem; margin-top: 8px; word-break: break-all; }
  .issues { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 14px;
    max-height: 200px; overflow-y: auto; font-size: 0.8rem; margin-bottom: 20px; }
  .issues li { color: var(--yellow); margin-left: 16px; }
  .issues .ok { color: var(--green); }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  thead { position: sticky; top: 0; }
  th { background: var(--bg3); color: var(--fg2); font-weight: 600; text-align: left;
    padding: 8px 10px; border-bottom: 1px solid var(--border); cursor: pointer; user-select: none; white-space: nowrap; }
  th:hover { color: var(--accent); }
  th.sorted-asc::after { content: " ▲"; }
  th.sorted-desc::after { content: " ▼"; }
  td { padding: 6px 10px; border-bottom: 1px solid var(--border); font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr:hover td { background: var(--bg2); }
  .num { text-align: right; }
  .pos { color: var(--green); }
  .neg { color: var(--red); }
  .zero { color: var(--fg3); }
  .warn { color: var(--yellow); }
  .filter-bar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
  .filter-bar input, .filter-bar select { background: var(--bg2); color: var(--fg); border: 1px solid var(--border);
    border-radius: 6px; padding: 6px 10px; font-size: 0.85rem; }
  .filter-bar input { min-width: 200px; }
  .filter-bar select { min-width: 120px; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; }
  .count { color: var(--fg2); font-size: 0.8rem; margin-bottom: 8px; }
</style>
</head>
<body>

<h1>RWA Perps — Adapter Preview</h1>
<div class="subtitle">Generated ${esc(ts)} — raw data from all platform adapters (no Airtable metadata filtering)</div>

<!-- Summary cards -->
<div class="cards">
  <div class="card">
    <div class="card-title">Total Markets</div>
    <div class="card-value">${allMarkets.length}</div>
    <div class="card-sub">${results.length} adapters</div>
  </div>
  <div class="card">
    <div class="card-title">Total Open Interest</div>
    <div class="card-value">${fmtUSD(totalOI)}</div>
    <div class="card-sub">raw OI (notional for new adapters, base×px for HL)</div>
  </div>
  <div class="card">
    <div class="card-title">Total 24h Volume</div>
    <div class="card-value">${fmtUSD(totalVol)}</div>
  </div>
  <div class="card">
    <div class="card-title">Data Issues</div>
    <div class="card-value ${issues.length === 0 ? "pos" : "warn"}">${issues.length}</div>
    <div class="card-sub">${issues.length === 0 ? "all clear" : "see below"}</div>
  </div>
  <div class="card">
    <div class="card-title">Inactive Markets</div>
    <div class="card-value">${inactiveCount}</div>
    <div class="card-sub">OI = 0 &amp; vol = 0</div>
  </div>
</div>

<!-- Platform cards -->
<h2>Platforms</h2>
<div class="platform-cards">
${results.map((r) => {
  const oi = r.markets.reduce((s, m) => s + m.openInterest, 0);
  const vol = r.markets.reduce((s, m) => s + m.volume24h, 0);
  const withPrice = r.markets.filter((m) => m.markPx > 0).length;
  const status = r.error ? "error" : r.markets.length === 0 ? "" : "";
  const badge = r.error
    ? `<span class="badge badge-err">ERROR</span>`
    : r.markets.length === 0
      ? `<span class="badge badge-empty">EMPTY</span>`
      : `<span class="badge badge-ok">${r.markets.length} mkts</span>`;
  return `<div class="pcard ${status}">
    <div class="pcard-header">
      <span class="pcard-name">${esc(r.name)}</span>
      ${badge}
    </div>
    <dl class="pcard-stats">
      <dt>OI</dt><dd>${fmtUSD(oi)}</dd>
      <dt>Volume 24h</dt><dd>${fmtUSD(vol)}</dd>
      <dt>Markets w/ price</dt><dd>${withPrice} / ${r.markets.length}</dd>
      <dt>Fetch time</dt><dd>${r.durationMs}ms</dd>
    </dl>
    ${r.error ? `<div class="pcard-error">${esc(r.error)}</div>` : ""}
  </div>`;
}).join("\n")}
</div>

<!-- Data quality -->
<h2>Data Quality</h2>
<div class="issues">
${issues.length === 0
    ? `<div class="ok">No issues found.</div>`
    : `<ul>${issues.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`}
</div>

<!-- Full market table -->
<h2>All Markets</h2>
<div class="filter-bar">
  <input id="search" type="text" placeholder="Filter by contract, venue, platform..." />
  <select id="platformFilter">
    <option value="">All platforms</option>
    ${results.map((r) => `<option value="${esc(r.name)}">${esc(r.name)} (${r.markets.length})</option>`).join("")}
  </select>
  <select id="issueFilter">
    <option value="">All rows</option>
    <option value="no-price">Price = 0</option>
    <option value="no-oi">OI = 0</option>
    <option value="no-vol">Vol = 0</option>
    <option value="has-data">Has price + OI</option>
  </select>
</div>
<div class="count" id="rowCount">${allMarkets.length} markets</div>
<div class="table-wrap">
<table>
<thead>
<tr>
  <th data-col="platform">Platform</th>
  <th data-col="venue">Venue</th>
  <th data-col="contract">Contract</th>
  <th data-col="markPx" class="num">Price</th>
  <th data-col="priceChange24h" class="num">24h Chg%</th>
  <th data-col="openInterest" class="num">Open Interest</th>
  <th data-col="volume24h" class="num">Volume 24h</th>
  <th data-col="fundingRate" class="num">Funding Rate</th>
  <th data-col="maxLeverage" class="num">Max Lev</th>
  <th data-col="oraclePx" class="num">Oracle Px</th>
  <th data-col="premium" class="num">Premium</th>
</tr>
</thead>
<tbody id="tbody">
${allMarkets.map((m) => {
  const pxClass = m.markPx === 0 ? "warn" : "";
  const oiClass = m.openInterest === 0 ? "zero" : "";
  const volClass = m.volume24h === 0 ? "zero" : "";
  const chgClass = m.priceChange24h > 0 ? "pos" : m.priceChange24h < 0 ? "neg" : "";
  return `<tr data-platform="${esc(m.platform)}" data-contract="${esc(m.contract)}" data-venue="${esc(m.venue)}"
    data-px="${m.markPx}" data-oi="${m.openInterest}" data-vol="${m.volume24h}">
  <td>${esc(m.platform)}</td>
  <td>${esc(m.venue)}</td>
  <td>${esc(m.contract)}</td>
  <td class="num ${pxClass}">${m.markPx === 0 ? '<span class="warn">$0</span>' : "$" + fmtNum(m.markPx, 4)}</td>
  <td class="num ${chgClass}">${fmtPct(m.priceChange24h)}</td>
  <td class="num ${oiClass}">${fmtUSD(m.openInterest)}</td>
  <td class="num ${volClass}">${fmtUSD(m.volume24h)}</td>
  <td class="num">${fmtPct(m.fundingRate)}</td>
  <td class="num">${m.maxLeverage || "—"}</td>
  <td class="num">${m.oraclePx ? "$" + fmtNum(m.oraclePx, 4) : "—"}</td>
  <td class="num">${m.premium ? fmtPct(m.premium) : "—"}</td>
</tr>`;
}).join("\n")}
</tbody>
</table>
</div>

<!-- Raw JSON dump per platform -->
<h2>Raw JSON (click to expand)</h2>
${results.map((r) => `
<details style="margin-bottom:8px;">
  <summary style="cursor:pointer;color:var(--accent);font-size:0.9rem;">
    ${esc(r.name)} — ${r.markets.length} markets ${r.error ? "(ERROR)" : ""}
  </summary>
  <pre style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px;
    overflow-x:auto;font-size:0.75rem;max-height:400px;overflow-y:auto;margin-top:6px;color:var(--fg2);">${esc(JSON.stringify(r.error ? { error: r.error } : r.markets, null, 2))}</pre>
</details>`).join("")}

<script>
// Client-side filtering and sorting
const tbody = document.getElementById('tbody');
const rows = [...tbody.querySelectorAll('tr')];
const search = document.getElementById('search');
const platformFilter = document.getElementById('platformFilter');
const issueFilter = document.getElementById('issueFilter');
const rowCount = document.getElementById('rowCount');

function applyFilters() {
  const q = search.value.toLowerCase();
  const pf = platformFilter.value;
  const iss = issueFilter.value;
  let visible = 0;
  rows.forEach(r => {
    const text = (r.dataset.platform + ' ' + r.dataset.venue + ' ' + r.dataset.contract).toLowerCase();
    let show = true;
    if (q && !text.includes(q)) show = false;
    if (pf && r.dataset.platform !== pf) show = false;
    if (iss === 'no-price' && +r.dataset.px !== 0) show = false;
    if (iss === 'no-oi' && +r.dataset.oi !== 0) show = false;
    if (iss === 'no-vol' && +r.dataset.vol !== 0) show = false;
    if (iss === 'has-data' && (+r.dataset.px === 0 || +r.dataset.oi === 0)) show = false;
    r.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  rowCount.textContent = visible + ' / ' + rows.length + ' markets';
}

search.addEventListener('input', applyFilters);
platformFilter.addEventListener('change', applyFilters);
issueFilter.addEventListener('change', applyFilters);

// Column sorting
let sortCol = null, sortDir = 1;
const numCols = new Set(['markPx','priceChange24h','openInterest','volume24h','fundingRate','maxLeverage','oraclePx','premium']);
document.querySelectorAll('th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (sortCol === col) sortDir *= -1;
    else { sortCol = col; sortDir = 1; }
    document.querySelectorAll('th').forEach(h => h.classList.remove('sorted-asc','sorted-desc'));
    th.classList.add(sortDir === 1 ? 'sorted-asc' : 'sorted-desc');
    const isNum = numCols.has(col);
    rows.sort((a, b) => {
      const cellA = a.children[[...th.parentElement.children].indexOf(th)];
      const cellB = b.children[[...th.parentElement.children].indexOf(th)];
      let va = cellA.textContent.replace(/[\\$,%+]/g, '').trim();
      let vb = cellB.textContent.replace(/[\\$,%+]/g, '').trim();
      if (isNum) {
        va = parseFloat(va) || 0; vb = parseFloat(vb) || 0;
        return (va - vb) * sortDir;
      }
      return va.localeCompare(vb) * sortDir;
    });
    rows.forEach(r => tbody.appendChild(r));
  });
});
</script>
</body>
</html>`;
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  });
