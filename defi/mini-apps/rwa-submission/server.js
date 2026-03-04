const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.RWA_SUBMISSION_PORT || 5002;
const DISCORD_WEBHOOK_URL = process.env.RWA_SUBMISSION_DISCORD_WEBHOOK;

if (!DISCORD_WEBHOOK_URL) {
    console.warn('WARNING: RWA_SUBMISSION_DISCORD_WEBHOOK environment variable not set. Submissions will be logged but not sent to Discord.');
}

function formatDiscordEmbed(data) {
    console.log(data);

    // Contracts
    const contractsStr = (data.blockchain?.contracts || [])
        .filter(c => c.chain && c.address)
        .map(c => `• \`${c.chain}:${c.address}\``)
        .join('\n');

    // Internal addresses
    const internalStr = (data.blockchain?.internalAddresses || [])
        .filter(a => a.address)
        .map(a => {
            let str = `• \`${a.chain ? a.chain + ':' : ''}${a.address}\``;
            if (a.label) str += ` (${a.label})`;
            return str;
        })
        .join('\n');

    const fields = [
        {
            name: '📋 Basic Information',
            value: [
                `**Token Name:** ${data.tokenName || 'N/A'}`,
                `**Ticker:** ${data.ticker || 'N/A'}`,
                data.logo ? `**Logo:** ${data.logo}` : null,
                data.website ? `**Website:** ${data.website}` : null,
                data.twitter ? `**Twitter:** ${data.twitter}` : null,
                data.telegram ? `**Telegram/Discord:** ${data.telegram}` : null,
            ].filter(Boolean).join('\n'),
            inline: false,
        },
        {
            name: '⛓️ Blockchain Information',
            value: [
                `**Primary Chain:** ${data.blockchain?.primaryChain || 'N/A'}`,
                `**All Chains:** ${data.blockchain?.allChains || 'N/A'}`,
                contractsStr ? `**Contracts:**\n${contractsStr}` : null,
                internalStr ? `**Internal Addresses:**\n${internalStr}` : null,
            ].filter(Boolean).join('\n'),
            inline: false,
        },
        {
            name: '📂 Asset Classification',
            value: `**Category:** ${data.category || 'N/A'}`,
            inline: false,
        },
        {
            name: '📊 Market Data',
            value: `**CoinGecko ID:** ${data.coingeckoId || 'Not listed'}`,
            inline: false,
        },
        {
            name: '🏢 Issuer Information',
            value: `**Issuer:** ${data.issuer || 'N/A'}`,
            inline: false,
        },
        {
            name: '🔍 Proof & Verification',
            value: `**Attestation:** ${data.attestation || 'None'}`,
            inline: false,
        },
        {
            name: '🏦 Exchange & Access',
            value: [
                `**CEX Listed:** ${data.exchange?.cexListed ?? 'N/A'}${data.exchange?.cexDetails ? ` — ${data.exchange.cexDetails}` : ''}`,
                `**KYC to Mint:** ${data.exchange?.kycToMint ?? 'N/A'}`,
                `**KYC Whitelist to Hold/Transfer:** ${data.exchange?.kycWhitelist ?? 'N/A'}`,
            ].join('\n'),
            inline: false,
        },
        {
            name: '🔄 Transfer & Custody',
            value: [
                `**Transferable:** ${data.custody?.transferable ?? 'N/A'}`,
                `**Self Custody:** ${data.custody?.selfCustody ?? 'N/A'}`,
            ].join('\n'),
            inline: false,
        },
    ];

    if (data.redemption) {
        fields.push({
            name: '💱 Redemption Process',
            value: data.redemption,
            inline: false,
        });
    }

    if (data.description) {
        fields.push({
            name: '📝 Description',
            value: data.description,
            inline: false,
        });
    }

    if (data.documentationLink) {
        fields.push({
            name: '📄 Documentation',
            value: data.documentationLink,
            inline: false,
        });
    }

    if (data.contactEmail) {
        fields.push({
            name: '📧 Contact',
            value: data.contactEmail,
            inline: false,
        });
    }

    return {
        embeds: [
            {
                title: `🆕 RWA Token Submission: ${data.tokenName || data.ticker || 'Unknown'}`,
                color: 0x58a6ff,
                fields,
                footer: {
                    text: `Submitted at ${new Date().toISOString()}`,
                },
            },
        ],
    };
}

async function sendToDiscord(data) {
    if (!DISCORD_WEBHOOK_URL) {
        console.log('Discord webhook not configured, skipping...');
        return true;
    }

    try {
        const embed = formatDiscordEmbed(data);

        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(embed),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Discord webhook error:', response.status, errorText);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error sending to Discord:', error);
        return false;
    }
}

function validateSubmission(data) {
    if (!data.tokenName || typeof data.tokenName !== 'string') {
        return { valid: false, error: 'Token name is required' };
    }
    if (!data.ticker || typeof data.ticker !== 'string') {
        return { valid: false, error: 'Ticker is required' };
    }
    return { valid: true };
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) {
                req.destroy();
                reject(new Error('Request body too large'));
            }
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(new Error('Invalid JSON'));
            }
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
    res.writeHead(200, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(html);
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        return res.end();
    }

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('OK');
    }

    // Serve frontend
    if (url.pathname === '/' && req.method === 'GET') {
        try {
            const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
            return sendHtml(res, html);
        } catch (e) {
            res.writeHead(500);
            return res.end('Error loading page');
        }
    }

    // API submission
    if (url.pathname === '/api/submit' && req.method === 'POST') {
        try {
            const data = await parseBody(req);

            const validation = validateSubmission(data);
            if (!validation.valid) {
                return sendJson(res, 400, { error: validation.error });
            }

            console.log('='.repeat(60));
            console.log('New RWA Token Submission:', new Date().toISOString());
            console.log('Token:', data.tokenName, `(${data.ticker})`);
            if (data.contactEmail) console.log('Contact:', data.contactEmail);
            console.log('='.repeat(60));

            const sent = await sendToDiscord(data);

            if (!sent && DISCORD_WEBHOOK_URL) {
                console.error('Failed to send to Discord');
            }

            return sendJson(res, 200, { success: true, message: 'Submission received' });
        } catch (error) {
            console.error('Error processing submission:', error);
            return sendJson(res, 500, { error: 'Internal server error' });
        }
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(port, () => {
    console.log(`RWA Token Submission Server started on port ${port}`);
    console.log(`Open http://localhost:${port} in your browser`);
});

process.on('SIGINT', () => {
    console.log('Shutting down...');
    server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
    console.log('Shutting down...');
    server.close(() => process.exit(0));
});
