const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.TOKEN_RIGHTS_PORT || 5001;
const DISCORD_WEBHOOK_URL = process.env.TOKEN_RIGHTS_DISCORD_WEBHOOK;

if (!DISCORD_WEBHOOK_URL) {
    console.warn('WARNING: TOKEN_RIGHTS_DISCORD_WEBHOOK environment variable not set. Submissions will be logged but not sent to Discord.');
}

function formatDiscordEmbed(data) {
    console.log(data);

    // Overview section
    const tokenTypeStr = data.overview?.tokenType?.length ? data.overview.tokenType.join(', ') : 'Not specified';
    const utilityStr = data.overview?.utility?.length ? data.overview.utility.join(', ') : 'Not specified';

    // Resources
    const resourcesStr = (data.resources || [])
        .filter(r => r.label)
        .map(r => {
            let str = `• **${r.label}**`;
            if (r.address) str += `\n  Address: \`${r.address}\``;
            if (r.url) str += `\n  URL: ${r.url}`;
            if (r.note) str += `\n  Note: ${r.note}`;
            return str;
        })
        .join('\n');

    // Governance links
    const govLinksStr = (data.governanceRights?.links || [])
        .filter(l => l.label && l.url)
        .map(l => `• [${l.label}](${l.url})`)
        .join('\n');

    // Ownership entities and ownership details
    const entitiesStr = data.ownershipRights?.associatedEntities?.length ? data.ownershipRights.associatedEntities.join(', ') : 'Not specified';
    const ipBrandStr = data.ownershipRights?.ipBrand?.length ? data.ownershipRights.ipBrand.join(', ') : 'Not specified';
    const domainStr = data.ownershipRights?.domain?.length ? data.ownershipRights.domain.join(', ') : 'Not specified';

    const fields = [
        {
            name: '📋 Protocol Info',
            value: `**Name:** ${data.protocolName}${data.contactEmail ? `\n**Email:** ${data.contactEmail}` : ''}${data.contactTelegram ? `\n**Telegram/Discord:** ${data.contactTelegram}` : ''}`,
            inline: false
        },
        {
            name: '📚 Overview',
            value: `**Tokens:** ${data.overview?.tokens || 'Not specified'}\n**Type:** ${tokenTypeStr}\n**Utility:** ${utilityStr}${data.overview?.briefDescription ? `\n**Description:** ${data.overview.briefDescription}` : ''}${data.overview?.primaryRevenueSource ? `\n**Revenue Source:** ${data.overview.primaryRevenueSource}` : ''}`,
            inline: false
        },
        {
            name: '🏛️ Governance Rights',
            value: `**Governance Decisions:** ${data.governanceRights?.governanceDecisions || 'Not specified'}\n**Treasury Decisions:** ${data.governanceRights?.treasuryDecisions || 'Not specified'}\n**Revenue Decisions:** ${data.governanceRights?.revenueDecisions || 'Not specified'}${data.governanceRights?.governanceDetails ? `\n**Details:** ${data.governanceRights.governanceDetails}` : ''}${data.governanceRights?.feeSwitchStatus ? `\n**Fee Switch:** ${data.governanceRights.feeSwitchStatus}` : ''}${data.governanceRights?.feeSwitchDetails ? `\n**Fee Switch Details:** ${data.governanceRights.feeSwitchDetails}` : ''}${govLinksStr ? `\n**Links:**\n${govLinksStr}` : ''}`,
            inline: false
        },
        {
            name: '💰 Economic Rights',
            value: `**Buybacks:** ${data.economicRights?.buybacks || 'Not specified'}\n**Dividends:** ${data.economicRights?.dividends || 'Not specified'}\n**Burns:** ${data.economicRights?.burns || 'Not specified'}${data.economicRights?.primaryValueAccrual ? `\n**Primary Value Accrual:** ${data.economicRights.primaryValueAccrual}` : ''}`,
            inline: false
        },
        {
            name: '📊 Ownership Rights',
            value: `**Fundraising:** ${data.ownershipRights?.fundraising || 'Not specified'}\n**Equity Revenue Capture:** ${data.ownershipRights?.equityRevenueCapture || 'Not specified'}${data.ownershipRights?.raiseDetails ? `\n**Raise Details:** ${data.ownershipRights.raiseDetails}` : ''}${data.ownershipRights?.raiseDetailsUrl ? `\n**Raise URL:** ${data.ownershipRights.raiseDetailsUrl}` : ''}\n**Associated Entities:** ${entitiesStr}\n**IP & Brand:** ${ipBrandStr}\n**Domain:** ${domainStr}${data.ownershipRights?.equityStatement ? `\n**Equity Statement:** ${data.ownershipRights.equityStatement}` : ''}`,
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
