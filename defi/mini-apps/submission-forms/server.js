const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.SUBMISSION_FORMS_PORT || 5001;

// ── Discord webhook (optional) ─────────────────────────────────────────────────
const DEFAULT_DISCORD_WEBHOOK_URL = process.env.DEFAULT_DISCORD_WEBHOOK_URL;
const DISCORD_WEBHOOK_URL = process.env.RWA_SUBMISSION_DISCORD_WEBHOOK || DEFAULT_DISCORD_WEBHOOK_URL;

if (!DISCORD_WEBHOOK_URL) {
    console.warn('WARNING: RWA_SUBMISSION_DISCORD_WEBHOOK not set. Submissions will be logged only.');
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) { req.destroy(); reject(new Error('Request body too large')); }
        });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data));
}

function sendHtml(res, html) {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
    res.end(html);
}

async function postToDiscord(webhookUrl, payload) {
    if (!webhookUrl) return true;
    try {
        const r = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!r.ok) { console.error('Discord webhook error:', r.status, await r.text()); return false; }
        return true;
    } catch (e) { console.error('Error sending to Discord:', e); return false; }
}

// ── RWA: Discord embed ─────────────────────────────────────────────────────────
function formatRwaEmbed(data) {
    const contractsStr = (data.blockchain?.contracts || []).filter(c => c.chain && c.address).map(c => `• \`${c.chain}:${c.address}\``).join('\n');
    const internalStr  = (data.blockchain?.internalAddresses || []).filter(a => a.address).map(a => {
        let s = `• \`${a.chain ? a.chain + ':' : ''}${a.address}\``;
        if (a.label) s += ` (${a.label})`;
        return s;
    }).join('\n');

    const fields = [
        { name: '📋 Basic Information',     value: [`**Token Name:** ${data.tokenName || 'N/A'}`, `**Ticker:** ${data.ticker || 'N/A'}`, data.logo ? `**Logo:** ${data.logo}` : null, data.website ? `**Website:** ${data.website}` : null, data.twitter ? `**Twitter:** ${data.twitter}` : null, data.telegram ? `**Telegram/Discord:** ${data.telegram}` : null].filter(Boolean).join('\n'), inline: false },
        { name: '⛓️ Blockchain Information', value: [`**Primary Chain:** ${data.blockchain?.primaryChain || 'N/A'}`, `**All Chains:** ${data.blockchain?.allChains || 'N/A'}`, contractsStr ? `**Contracts:**\n${contractsStr}` : null, internalStr ? `**Internal Addresses:**\n${internalStr}` : null].filter(Boolean).join('\n'), inline: false },
        { name: '📂 Asset Classification',  value: `**Category:** ${data.category || 'N/A'}`, inline: false },
        { name: '📊 Market Data',           value: `**CoinGecko ID:** ${data.coingeckoId || 'Not listed'}`, inline: false },
        { name: '🏢 Issuer Information',    value: `**Issuer:** ${data.issuer || 'N/A'}`, inline: false },
        { name: '🔍 Proof & Verification',  value: `**Attestation:** ${data.attestation || 'None'}`, inline: false },
        { name: '🏦 Exchange & Access',     value: [`**CEX Listed:** ${data.exchange?.cexListed ?? 'N/A'}${data.exchange?.cexDetails ? ` — ${data.exchange.cexDetails}` : ''}`, `**KYC to Mint:** ${data.exchange?.kycToMint ?? 'N/A'}`, `**KYC Whitelist to Hold/Transfer:** ${data.exchange?.kycWhitelist ?? 'N/A'}`].join('\n'), inline: false },
        { name: '🔄 Transfer & Custody',    value: [`**Transferable:** ${data.custody?.transferable ?? 'N/A'}`, `**Self Custody:** ${data.custody?.selfCustody ?? 'N/A'}`].join('\n'), inline: false },
    ];
    if (data.redemption)       fields.push({ name: '💱 Redemption Process', value: data.redemption, inline: false });
    if (data.description)      fields.push({ name: '📝 Description', value: data.description, inline: false });
    if (data.documentationLink) fields.push({ name: '📄 Documentation', value: data.documentationLink, inline: false });
    if (data.contactEmail)     fields.push({ name: '📧 Contact', value: data.contactEmail, inline: false });

    return { embeds: [{ title: `🆕 RWA Token Submission: ${data.tokenName || data.ticker || 'Unknown'}`, color: 0x58a6ff, fields, footer: { text: `Submitted at ${new Date().toISOString()}` } }] };
}

// ── RWA: Batch Discord embed (multiple tokens in one message) ─────────────────
function formatRwaBatchEmbed(tokens) {
    const fields = [];
    const issuer = tokens[0]?.issuer || 'Unknown';
    const website = tokens[0]?.website || '';
    const twitter = tokens[0]?.twitter || '';
    const contactEmail = tokens[0]?.contactEmail || '';

    // Shared issuer header
    const issuerLines = [`**Issuer:** ${issuer}`];
    if (website) issuerLines.push(`**Website:** ${website}`);
    if (twitter) issuerLines.push(`**Twitter:** ${twitter}`);
    if (contactEmail) issuerLines.push(`**Contact:** ${contactEmail}`);
    fields.push({ name: '🏢 Issuer Information', value: issuerLines.join('\n'), inline: false });

    for (let i = 0; i < tokens.length; i++) {
        const data = tokens[i];
        const contractsStr = (data.blockchain?.contracts || []).filter(c => c.chain && c.address).map(c => `\`${c.chain}:${c.address}\``).join(', ');
        const internalStr = (data.blockchain?.internalAddresses || []).filter(a => a.address).map(a => {
            let s = `\`${a.chain ? a.chain + ':' : ''}${a.address}\``;
            if (a.label) s += ` (${a.label})`;
            return s;
        }).join(', ');

        const lines = [
            `**Ticker:** ${data.ticker || 'N/A'}`,
            `**Category:** ${data.category || 'N/A'} | **Asset Class:** ${data.assetClass || 'N/A'} | **Group:** ${data.assetGroup || 'N/A'}`,
            `**Chain:** ${data.blockchain?.primaryChain || 'N/A'}${data.blockchain?.allChains ? ` (All: ${data.blockchain.allChains})` : ''}`,
        ];
        if (contractsStr) lines.push(`**Contracts:** ${contractsStr}`);
        if (internalStr) lines.push(`**Internal:** ${internalStr}`);
        if (data.coingeckoId) lines.push(`**CoinGecko:** ${data.coingeckoId}`);
        lines.push(`**CEX:** ${data.exchange?.cexListed ?? 'N/A'}${data.exchange?.cexDetails ? ` (${data.exchange.cexDetails})` : ''} | **KYC Mint:** ${data.exchange?.kycToMint ?? 'N/A'} | **KYC Hold:** ${data.exchange?.kycWhitelist ?? 'N/A'}`);
        lines.push(`**Transferable:** ${data.custody?.transferable ?? 'N/A'} | **Self Custody:** ${data.custody?.selfCustody ?? 'N/A'}`);
        if (data.redemption) lines.push(`**Redemption:** ${data.redemption}`);
        if (data.attestation) lines.push(`**Attestation:** ${data.attestation}`);
        if (data.description) lines.push(`**Desc:** ${data.description.slice(0, 200)}`);
        if (data.logo) lines.push(`**Logo:** ${data.logo}`);

        fields.push({ name: `📋 Token #${i + 1}: ${data.tokenName || 'N/A'}`, value: lines.join('\n'), inline: false });
    }

    const tickers = tokens.map(t => t.ticker || '?').join(', ');
    return { embeds: [{ title: `🆕 RWA Batch Submission (${tokens.length} tokens): ${tickers}`, color: 0x58a6ff, fields, footer: { text: `Submitted at ${new Date().toISOString()}` } }] };
}

// ── Validator ──────────────────────────────────────────────────────────────────
function validateRwa(data) {
    if (!data.tokenName || typeof data.tokenName !== 'string') return { valid: false, error: 'Token name is required' };
    if (!data.ticker   || typeof data.ticker   !== 'string') return { valid: false, error: 'Ticker is required' };
    return { valid: true };
}

// ── Serve a file helper ────────────────────────────────────────────────────────
function serveFile(res, filePath) {
    try {
        const html = fs.readFileSync(filePath, 'utf8');
        return sendHtml(res, html);
    } catch {
        res.writeHead(500);
        return res.end('Error loading page');
    }
}

// ── Home page ──────────────────────────────────────────────────────────────────
const HOME_HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DefiLlama Submissions</title>
<style>
  :root{--bg:#0d1117;--surface:#161b22;--border:#30363d;--text:#e6edf3;--muted:#8b949e;--accent:#58a6ff}
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .wrap{text-align:center;max-width:500px;padding:40px 20px}
  h1{font-size:1.8rem;margin-bottom:8px;background:linear-gradient(135deg,var(--accent),#a371f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  p{color:var(--muted);margin-bottom:32px}
  .links{display:flex;flex-direction:column;gap:12px}
  a{display:block;padding:16px 24px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--accent);text-decoration:none;font-weight:600;font-size:1rem;transition:border-color .2s,transform .15s}
  a:hover{border-color:var(--accent);transform:translateY(-2px)}
  a span{display:block;color:var(--muted);font-weight:400;font-size:.85rem;margin-top:4px}
</style>
</head><body>
<div class="wrap">
  </div>
</div>
</body></html>`;

// ── HTTP Server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const p = url.pathname.replace(/\/+$/, '') || '/';   // normalize trailing slashes

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
        return res.end();
    }

    // Health check
    if (p === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('OK');
    }

    // ── Home ───────────────────────────────────────────────────────────────────
    if (p === '/' && req.method === 'GET') {
        return sendHtml(res, HOME_HTML);
    }

    // ── Token Rights (served as static page only — submissions go to Google API) ──
    if (p === '/token-rights' && req.method === 'GET') {
        return serveFile(res, path.join(__dirname, 'public', 'token-rights.html'));
    }

    // ── RWA Submission ─────────────────────────────────────────────────────────
    if (p === '/rwa-submission' && req.method === 'GET') {
        return serveFile(res, path.join(__dirname, 'public', 'rwa-submission.html'));
    }

    if (p === '/rwa-submission/api/submit' && req.method === 'POST') {
        try {
            const data = await parseBody(req);
            const v = validateRwa(data);
            if (!v.valid) return sendJson(res, 400, { error: v.error });

            console.log('='.repeat(60));
            console.log('New RWA Token Submission:', new Date().toISOString());
            console.log('Token:', data.tokenName, `(${data.ticker})`);
            if (data.contactEmail) console.log('Contact:', data.contactEmail);
            console.log('='.repeat(60));

            const sent = await postToDiscord(DISCORD_WEBHOOK_URL, formatRwaEmbed(data));
            if (!sent && DISCORD_WEBHOOK_URL) console.error('Failed to send RWA to Discord');

            return sendJson(res, 200, { success: true, message: 'Submission received' });
        } catch (error) {
            console.error('Error processing RWA submission:', error);
            return sendJson(res, 500, { error: 'Internal server error' });
        }
    }

    if (p === '/rwa-submission/api/submit-batch' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const tokens = body?.tokens;
            if (!Array.isArray(tokens) || tokens.length === 0) return sendJson(res, 400, { error: 'At least one token is required' });
            if (tokens.length > 50) return sendJson(res, 400, { error: 'Maximum 50 tokens per batch' });

            for (let i = 0; i < tokens.length; i++) {
                const v = validateRwa(tokens[i]);
                if (!v.valid) return sendJson(res, 400, { error: `Token #${i + 1}: ${v.error}` });
            }

            const tickers = tokens.map(t => t.ticker).join(', ');
            console.log('='.repeat(60));
            console.log('New RWA Batch Submission:', new Date().toISOString());
            console.log(`${tokens.length} tokens: ${tickers}`);
            console.log('Issuer:', tokens[0]?.issuer || 'N/A');
            if (tokens[0]?.contactEmail) console.log('Contact:', tokens[0].contactEmail);
            console.log('='.repeat(60));

            const sent = await postToDiscord(DISCORD_WEBHOOK_URL, formatRwaBatchEmbed(tokens));
            if (!sent && DISCORD_WEBHOOK_URL) console.error('Failed to send RWA batch to Discord');

            return sendJson(res, 200, { success: true, message: `${tokens.length} token(s) received` });
        } catch (error) {
            console.error('Error processing RWA batch submission:', error);
            return sendJson(res, 500, { error: 'Internal server error' });
        }
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(port, () => {
    console.log(`Submission Forms Server started on port ${port}`);
    console.log(`  Home:          http://localhost:${port}`);
    console.log(`  RWA:           http://localhost:${port}/rwa-submission`);
    console.log(`  Token Rights:  http://localhost:${port}/token-rights (static, submits to Google)`);
});

process.on('SIGINT',  () => { console.log('Shutting down...'); server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { console.log('Shutting down...'); server.close(() => process.exit(0)); });
