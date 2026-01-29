const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.TOKEN_RIGHTS_PORT || 5001;
const DISCORD_WEBHOOK_URL = process.env.TOKEN_RIGHTS_DISCORD_WEBHOOK;

if (!DISCORD_WEBHOOK_URL) {
    console.warn('WARNING: TOKEN_RIGHTS_DISCORD_WEBHOOK environment variable not set. Submissions will be logged but not sent to Discord.');
}

function formatDiscordEmbed(data) {
    const rightsStr = data.rights
        .map(r => `${r.hasRight ? '✅' : '❌'} **${r.label}**${r.details ? `: ${r.details}` : ''}`)
        .join('\n');

    const resourcesStr = data.resources
        .filter(r => r.label)
        .map(r => {
            let str = `• **${r.label}**`;
            if (r.address) str += `\n  Address: \`${r.address}\``;
            if (r.url) str += `\n  URL: ${r.url}`;
            if (r.note) str += `\n  Note: ${r.note}`;
            return str;
        })
        .join('\n');

    const entitiesStr = data.tokenAlignment?.associatedEntities?.join(', ') || 'Not specified';

    const fields = [
        {
            name: '📋 Protocol Info',
            value: `**Name:** ${data.protocolName}${data.contactEmail ? `\n**Email:** ${data.contactEmail}` : ''}${data.contactTelegram ? `\n**Telegram/Discord:** ${data.contactTelegram}` : ''}`,
            inline: false
        },
        {
            name: '🔗 Token Rights',
            value: rightsStr || 'None specified',
            inline: false
        },
        {
            name: '🏛️ Governance',
            value: `**Rights:** ${data.governanceData?.rights || 'Not specified'}${data.governanceData?.details ? `\n**Details:** ${data.governanceData.details}` : ''}${data.governanceData?.feeSwitchStatus ? `\n**Fee Switch:** ${data.governanceData.feeSwitchStatus}` : ''}${data.governanceData?.feeSwitchDetails ? `\n**Fee Details:** ${data.governanceData.feeSwitchDetails}` : ''}`,
            inline: false
        },
        {
            name: '💰 Value Accrual',
            value: `**Buybacks:** ${data.holdersRevenueAndValueAccrual?.buybacks || 'Not specified'}\n**Dividends:** ${data.holdersRevenueAndValueAccrual?.dividends || 'Not specified'}\n**Burns:** ${data.holdersRevenueAndValueAccrual?.burns || 'Not specified'}${data.holdersRevenueAndValueAccrual?.primaryValueAccrual ? `\n**Primary:** ${data.holdersRevenueAndValueAccrual.primaryValueAccrual}` : ''}`,
            inline: false
        },
        {
            name: '📊 Token Alignment',
            value: `**Fundraising:** ${data.tokenAlignment?.fundraising || 'Not specified'}\n**Equity Revenue:** ${data.tokenAlignment?.equityRevenueCapture || 'Not specified'}\n**Entities:** ${entitiesStr}${data.tokenAlignment?.equityStatement ? `\n**Statement:** ${data.tokenAlignment.equityStatement}` : ''}`,
            inline: false
        }
    ];

    if (resourcesStr) {
        fields.push({
            name: '📎 Resources',
            value: resourcesStr,
            inline: false
        });
    }

    if (data.additionalNotes) {
        fields.push({
            name: '📝 Additional Notes',
            value: data.additionalNotes,
            inline: false
        });
    }

    return {
        embeds: [
            {
                title: `🆕 Token Rights Submission: ${data.protocolName}`,
                color: 0x58a6ff,
                fields,
                footer: {
                    text: `Submitted at ${new Date().toISOString()}`
                }
            }
        ]
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
            headers: {
                'Content-Type': 'application/json',
            },
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
    if (!data.protocolName || typeof data.protocolName !== 'string') {
        return { valid: false, error: 'Protocol name is required' };
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
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function sendHtml(res, html) {
    res.writeHead(200, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
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
            'Access-Control-Allow-Headers': 'Content-Type'
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

            // Validate
            const validation = validateSubmission(data);
            if (!validation.valid) {
                return sendJson(res, 400, { error: validation.error });
            }

            // Log submission
            console.log('='.repeat(60));
            console.log('New Token Rights Submission:', new Date().toISOString());
            console.log('Protocol:', data.protocolName);
            if (data.contactEmail) console.log('Contact:', data.contactEmail);
            console.log('='.repeat(60));

            // Send to Discord
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
    console.log(`Token Rights Submission Server started on port ${port}`);
    console.log(`Open http://localhost:${port} in your browser`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
    console.log('Shutting down...');
    server.close(() => process.exit(0));
});
