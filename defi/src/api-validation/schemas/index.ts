import { JSONSchema7 } from 'json-schema';

// Base response schema that all API responses should follow
export const baseResponseSchema: JSONSchema7 = {
    type: 'object',
    properties: {
        status: { type: 'string', enum: ['success', 'error'] },
        timestamp: { type: 'number' },
        data: { type: 'object' },
        message: { type: 'string' }
    },
    required: ['status', 'timestamp', 'data'],
    additionalProperties: false
};

// Protocol data schema
export const protocolSchema: JSONSchema7 = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        url: { type: 'string' },
        description: { type: 'string' },
        logo: { type: 'string' },
        chains: {
            type: 'array',
            items: { type: 'string' }
        },
        category: { type: 'string' },
        tvl: { type: 'number' },
        change_1h: { type: 'number' },
        change_1d: { type: 'number' },
        change_7d: { type: 'number' },
        mcap: { type: 'number' },
        fdv: { type: 'number' },
        staking: { type: 'number' },
        pool2: { type: 'number' },
        borrowed: { type: 'number' },
        doublecounted: { type: 'number' },
        liquidated: { type: 'number' },
        noil: { type: 'number' },
        timestamp: { type: 'number' },
        lastHourlyRecord: { type: 'object' },
        lastRecord: { type: 'object' },
        chainTvls: { type: 'object' },
        currentChainTvls: { type: 'object' },
        tokens: { type: 'array' },
        tokensInUsd: { type: 'array' },
        hallmarks: { type: 'array' },
        methodology: { type: 'string' },
        misrepresentedTokens: { type: 'boolean' },
        oracles: { type: 'array' },
        audits: { type: 'array' },
        audit_links: { type: 'array' },
        audit_note: { type: 'string' },
        gecko_id: { type: 'string' },
        cmcId: { type: 'string' },
        parentProtocol: { type: 'string' },
        deadFrom: { type: 'string' },
        listedAt: { type: 'number' },
        slug: { type: 'string' },
        tvl: { type: 'number' },
        tvlPrevDay: { type: 'number' },
        tvlPrevWeek: { type: 'number' },
        tvlPrevMonth: { type: 'number' }
    },
    required: ['id', 'name', 'tvl', 'timestamp'],
    additionalProperties: false
};

// Chain data schema
export const chainSchema: JSONSchema7 = {
    type: 'object',
    properties: {
        gecko_id: { type: 'string' },
        tvl: { type: 'number' },
        tokenSymbol: { type: 'string' },
        cmcId: { type: 'string' },
        name: { type: 'string' },
        chainId: { type: 'number' },
        extraTokens: { type: 'array' },
        governanceID: { type: 'array' },
        parent: { type: 'object' },
        protocols: { type: 'number' },
        volume: { type: 'number' },
        fees: { type: 'number' },
        change_1h: { type: 'number' },
        change_1d: { type: 'number' },
        change_7d: { type: 'number' },
        timestamp: { type: 'number' }
    },
    required: ['gecko_id', 'tvl', 'name', 'timestamp'],
    additionalProperties: false
};

// Treasury data schema
export const treasurySchema: JSONSchema7 = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        url: { type: 'string' },
        description: { type: 'string' },
        logo: { type: 'string' },
        chains: {
            type: 'array',
            items: { type: 'string' }
        },
        category: { type: 'string' },
        tvl: { type: 'number' },
        change_1h: { type: 'number' },
        change_1d: { type: 'number' },
        change_7d: { type: 'number' },
        timestamp: { type: 'number' },
        ownTokens: { type: 'object' }
    },
    required: ['id', 'name', 'tvl', 'timestamp'],
    additionalProperties: false
};

// Entity data schema
export const entitySchema: JSONSchema7 = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        url: { type: 'string' },
        description: { type: 'string' },
        logo: { type: 'string' },
        chains: {
            type: 'array',
            items: { type: 'string' }
        },
        category: { type: 'string' },
        tvl: { type: 'number' },
        change_1h: { type: 'number' },
        change_1d: { type: 'number' },
        change_7d: { type: 'number' },
        timestamp: { type: 'number' }
    },
    required: ['id', 'name', 'tvl', 'timestamp'],
    additionalProperties: false
};

// CEX data schema
export const cexSchema: JSONSchema7 = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        url: { type: 'string' },
        description: { type: 'string' },
        logo: { type: 'string' },
        chains: {
            type: 'array',
            items: { type: 'string' }
        },
        category: { type: 'string' },
        tvl: { type: 'number' },
        change_1h: { type: 'number' },
        change_1d: { type: 'number' },
        change_7d: { type: 'number' },
        timestamp: { type: 'number' },
        volume: { type: 'number' },
        fees: { type: 'number' }
    },
    required: ['id', 'name', 'tvl', 'timestamp'],
    additionalProperties: false
};

// Chart data schema
export const chartSchema: JSONSchema7 = {
    type: 'object',
    properties: {
        date: { type: 'number' },
        tvl: { type: 'number' },
        volume: { type: 'number' },
        fees: { type: 'number' }
    },
    required: ['date', 'tvl'],
    additionalProperties: false
};

// Token data schema
export const tokenSchema: JSONSchema7 = {
    type: 'object',
    properties: {
        address: { type: 'string' },
        symbol: { type: 'string' },
        decimals: { type: 'number' },
        price: { type: 'number' },
        mcap: { type: 'number' },
        fdv: { type: 'number' },
        volume: { type: 'number' },
        timestamp: { type: 'number' }
    },
    required: ['address', 'symbol', 'decimals', 'price', 'timestamp'],
    additionalProperties: false
};

// API endpoint schemas mapping
export const endpointSchemas: Record<string, JSONSchema7> = {
    '/protocols': {
        type: 'object',
        properties: {
            protocols: {
                type: 'array',
                items: protocolSchema
            }
        },
        required: ['protocols'],
        additionalProperties: false
    },
    '/protocol/:name': protocolSchema,
    '/treasury/:name': treasurySchema,
    '/entity/:name': entitySchema,
    '/chains': {
        type: 'object',
        properties: {
            chains: {
                type: 'array',
                items: chainSchema
            }
        },
        required: ['chains'],
        additionalProperties: false
    },
    '/cexs': {
        type: 'object',
        properties: {
            cexs: {
                type: 'array',
                items: cexSchema
            }
        },
        required: ['cexs'],
        additionalProperties: false
    },
    '/tvl/:name': {
        type: 'object',
        properties: {
            tvl: { type: 'number' },
            timestamp: { type: 'number' }
        },
        required: ['tvl', 'timestamp'],
        additionalProperties: false
    },
    '/charts/:name': {
        type: 'object',
        properties: {
            chart: {
                type: 'array',
                items: chartSchema
            }
        },
        required: ['chart'],
        additionalProperties: false
    }
};

// Export all schemas
export const schemas = {
    baseResponse: baseResponseSchema,
    protocol: protocolSchema,
    chain: chainSchema,
    treasury: treasurySchema,
    entity: entitySchema,
    cex: cexSchema,
    chart: chartSchema,
    token: tokenSchema,
    endpointSchemas
};

export default schemas;
