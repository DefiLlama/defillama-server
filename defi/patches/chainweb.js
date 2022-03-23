/**
 * Functions for querying the Kadena Chainweb blockchain API
 *
 * @author Lars Kuhtz
 * @module chainweb
 */

/* ************************************************************************** */
/* Dependencies */

/* External */
const base64url = require("base64-url");
const fetch = require("node-fetch");
const EventSource = require('eventsource')
const pRetry = require('p-retry');

/* Internal */
const HeaderBuffer = require('./HeaderBuffer');

/* ************************************************************************** */
/* Utils */

/**
 * Decode base64url encoded JSON text
 *
 * @param {string} txt - base64url encoded json text
 */
const base64json = txt => JSON.parse(base64url.decode(txt));

class ResponseError extends Error {
    constructor(response) {
        const msg = `Request ${response.url} failed with ${response.status}, ${response.statusText}`;
        super(msg);
        this.response = response;
    }
}

/**
 * Retry a fetch callback
 *
 * @param {Object} [retryOptions] - retry options object as accepted by the retry package
 * @param {boolean} [retryOptions.retry404=false] - whether to retry on 404 results
 * @return {Promise} Promise object that represents the response of the fetch action.
 */
const retryFetch = async (retryOptions, fetchAction) => {

    // set default retryOptions, with any passed-in retryOptions overriding the defaults
    retryOptions = {
        onFailedAttempt: (x => console.log("failed fetch attempt:", x.message)),
        retries: 2,
        minTimeout: 500,
        randomize: true,
        retry404: false,
        ...retryOptions
    };

    const retry404 = retryOptions.retry404;

    const run = async () => {
        const response = await fetchAction();
        if (response.status == 200) {
            return response;

        // retry 404 if requested
        } else if (response.status == 404 && retry404) { // not found
            throw new ResponseError(response);

        // retry potentially ephemeral failure conditions
        } else if (response.status == 408) { // response timeout
            throw new ResponseError(response);
        } else if (response.status == 423) { // locked
            throw new ResponseError(response);
        } else if (response.status == 425) { // too early
            throw new ResponseError(response);
        } else if (response.status == 429) { // too many requests
            throw new ResponseError(response);
        } else if (response.status == 500) { // internal server error
            throw new ResponseError(response);
        } else if (response.status == 502) { // bad gateway
            throw new ResponseError(response);
        } else if (response.status == 503) { // service unavailable
            throw new ResponseError(response);
        } else if (response.status == 504) { // gateway timeout
            throw new ResponseError(response);

        // don't retry on anything else
        } else if (response.status == 204) { // no content
            throw new pRetry.AbortError(new ResponseError(response));
        } else {
            throw new pRetry.AbortError(new ResponseError(response));
        }
    }

    return await pRetry(run, retryOptions);
}

/**
 * Create URL for the Chainweb API
 *
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @param {string} pathSuffix - suffix of the path that is appended to the path of the base URL
 * @return {Object} URL
 */
const baseUrl = (network = "mainnet01", host = "https://api.chainweb.com", pathSuffix) => {
    return new URL(`${host}/chainweb/0.0/${network}/${pathSuffix}`);
}

/**
 * Create URL for a chain endpoint of the Chainweb API
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @param {string} pathSuffix - suffix of the path that is appended to the path of the chain URL
 * @return {Object} URL
 */
const chainUrl = (chainId, network, host, pathSuffix) => {
    if (chainId == null) {
        throw new Error("missing chainId parameter");
    }
    return baseUrl(network, host, `chain/${chainId}/${pathSuffix}`);
}

/* ************************************************************************** */
/* Pageing Tools */

/** Yields full pages, i.e. arrarys of page items.
 *
 * @param {callback} query - A query callback that takes a `next` and an optional `limit` parameter.
 * @param {number} [n] - Optional upper limit and the number of returned items.
 */
const pageIterator = async function * (query, n) {
    let next = null;
    let c = 0;
    do {
        const limit = n ? n - c : null;
        const page = await query(next, limit);
        next = page.next;
        c += page.limit;
        yield page.items;
    } while (next && (n ? c < n : true));
}

/** Yields flattened pages, i.e. individual page items are yielded.
 */
const pageItemIterator = async function * (query, n) {
    const iter = pageIterator(query, n);
    for await (p of iter) {
        for await (i of p) {
            yield p;
        }
    }
}

/* Yields items from pages in reverse order.
 *
 * WARNING: This awaits and buffers all pages before returning.
 */
const reversePages = async (query, n) => {
    const iter = pageIterator(query, n);
    let ps = [];
    for await (p of iter) {
        ps.unshift(p.reverse());
    }
    return ps.flat();
}

/* ************************************************************************** */
/* Chainweb API Requests */

/**
 * Cut the current cut from a chainweb node
 *
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @param {Object} [retryOptions] - retry options object as accepted by the retry package
 * @param {boolean} [retryOptions.retry404=false] - whether to retry on 404 results
 * @return {Object} cut hashes object
 *
 * @alias module:chainweb.cut.current
 */
const currentCut = async (network, host, retryOptions) => {
    const response = await retryFetch(
        retryOptions,
        () => fetch(baseUrl(network, host, "cut"))
    );
    return response.json();
}

/**
 * Page of P2P peers of the cut network
 *
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @param {Object} [retryOptions] - retry options object as accepted by the retry package
 * @param {boolean} [retryOptions.retry404=false] - whether to retry on 404 results
 * @return {Object[ Page of peer objects. The size of a page is determined by the server.
 *
 * @alias module:chainweb.cut.peers
 */
const cutPeerPage = async (network, host, retryOptions) => {
    const response = await retryFetch(
        retryOptions,
        () => fetch(baseUrl(network, host, "cut/peer"))
    );
    return response.json()
}

/**
 * P2P peers of the cut network
 *
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @param {Object} [retryOptions] - retry options object as accepted by the retry package
 * @param {boolean} [retryOptions.retry404=false] - whether to retry on 404 results
 * @return {Object[]} Array of peer objects
 *
 * @alias module:chainweb.cut.peers
 */
const cutPeers = async (network, host, retryOptions) => {
    const page = await cutPeerPage(network, host, retryOptions);
    return page.items.reverse();
}

/**
 * A signle block header page in decending order
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string[]} [upper]- only antecessors of these block hashes are returned. Note that if this is null, the result is empty.
 * @param {string[]} [lower] - no antecessors of these block hashes are returned.
 * @param {number} [minHeight] - if given, minimum height of returned headers
 * @param {number} [maxHeight] - if given, maximum height of returned headers
 * @param {number} [n] - if given, limits the number of results. This is an upper limit. The actual number of returned items can be lower.
 * @param {number} [next] - if given, provides a cursor that points to the next page of the result. The cursor is the `next` property of the previous page.
 * @param {string} [format='json'] - encoding of result headers. Possible values are 'json' (default) and 'binary'.
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @param {Object} [retryOptions] - retry options object as accepted by the retry package
 * @param {boolean} [retryOptions.retry404=false] - whether to retry on 404 results
 * @return {Object} Page of block headers in requested format. Headers are listed in decending order by height. The page size of a page is determined by the server.
 *
 * @alias module:chainweb.internal.branch
 */
const branchPage = async (chainId, upper, lower, minHeight, maxHeight, n, next, format, network, host, retryOptions) => {

    /* Format and Accept header value */
    format = format ? format : 'json';
    var accept = "";
    switch (format) {
        case 'json': accept = 'application/json;blockheader-encoding=object'; break;
        case 'binary': accept = 'application/json'; break;
        default: throw new Error(`Unsupported header format ${format}. Supported values are 'json' and 'binary'.`)
    }

    /* URL */
    let url = chainUrl(chainId, network, host, "header/branch");
    if (minHeight != null) {
        url.searchParams.append("minheight", minHeight);
    }
    if (maxHeight != null) {
        url.searchParams.append("maxheight", maxHeight);
    }
    if (n != null) {
        url.searchParams.append("limit", n);
    }
    if (next != null) {
        url.searchParams.append("next", next);
    }

    /* Body */
    const body = {
        upper: upper,
        lower: lower
    };

    const response = await retryFetch(
        retryOptions,
        () => fetch(url, {
            method: 'post',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                'Accept': accept,
            }
        })
    );
    return response.json();
}

/**
 * Return block headers from chain
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string[]} [upper]- only antecessors of these block hashes are returned. Note that if this is null, the result is empty.
 * @param {string[]} [lower] - no antecessors of these block hashes are returned.
 * @param {number} [minHeight] - if given, minimum height of returned headers
 * @param {number} [maxHeight] - if given, maximum height of returned headers
 * @param {number} [n] - if given, limits the number of results. This is an upper limit. The actual number of returned items can be lower.
 * @param {string} [format='json'] - encoding of result headers. Possible values are 'json' (default) and 'binary'.
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @param {Object} [retryOptions] - retry options object as accepted by the retry package
 * @param {boolean} [retryOptions.retry404=false] - whether to retry on 404 results
 * @return [Object] Array of block headers in the requested format.
 *
 * @alias module:chainweb.internal.branch
 */
const branch = async (chainId, upper, lower, minHeight, maxHeight, n, format, network, host, retryOptions) => {
    return await reversePages((next, limit) => {
        return branchPage (chainId, upper, lower, minHeight, maxHeight, limit, next, format, network, host, retryOptions)
    }, n);
}

/**
 * Headers from the current branch of the chain
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {number} start - start block height
 * @param {number} end - end block height
 * @param {number} [n] - if given, limits the number of results. This is an upper limit. The actual number of returned items can be lower.
 * @param {string} [format='json'] - encoding of result headers. Possible values are 'json' (default) and 'binary'.
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return [Object] Array of block headers in the requested format.
 *
 * @alias module:chainweb.internal.currentBranch
 */
const currentBranch = async (chainId, start, end, n, format, network, host) => {
    const cut = await currentCut(network, host);
    return await branch(
            chainId,
            [cut.hashes[`${chainId}`].hash],
            [],
            start,
            end,
            n,
            format,
            network,
            host
        );
}

/**
 * Payloads with outputs
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string[]} hashes - array of block payload hashes
 * @param {string} [format='json'] - encoding of payload properties. Possible values are 'json' (default) and 'base64'.
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @param {Object} [retryOptions] - retry options object as accepted by the retry package
 * @param {boolean} [retryOptions.retry404=false] - whether to retry on 404 results
 * @return {Object[]} Array of block header objects. There is no guarantee about how many paylaods are returned and what payloads aer included in the result.
 *
 * @alias module:chainweb.internal.payloads
 */
const payloads = async (chainId, hashes, format, network, host, retryOptions) => {

    format = format ? format : 'json';

    const url = chainUrl(chainId, network, host, `payload/outputs/batch`);

    const response = await retryFetch(
        retryOptions,
        () => fetch(url, {
            method: 'post',
            body: JSON.stringify(hashes),
            headers: {
            'Content-Type': 'application/json'
            }
        })
    );

    let res = await response.json();

    if (format == 'json') {
        return res.map(x => {
            const txs = x.transactions;
            x.minerData = base64json(x.minerData);
            x.coinbase = base64json(x.coinbase);
            x.transactions = txs.map(y => {
                const tx = base64json(y[0]);
                const out = base64json(y[1]);
                tx.cmd = JSON.parse(tx.cmd);
                return {
                    transaction: tx,
                    output: out
                };
            });
            return x;
        });
    } else if (format == 'base64') {
        return x;
    } else {
        throw new Error(`Unsupported format '${format}'. Supported formats are 'json' (default) and 'base64'`);
    }
}

/**
 * Callback for processing individual items of an updates stream
 *
 * @callback updatesCallback
 * @param {Object} update - update object
 */

/**
 * @param {headerCallback} callback - function that is called for each update
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 */
const headerUpdates = (callback, network, host) => {
    const url = baseUrl(network, host, "header/updates");
    const es = new EventSource(`${url}`);
    es.onerror = (err) => { throw err; };
    es.addEventListener('BlockHeader', m => callback(JSON.parse(m.data)));
    return es;
}

/**
 * Apply callback to new updates.
 *
 * Same as headerUpdates, but filters for chains and only processes header
 * updates that have reached the given confirmation depth in the chain.
 *
 * @param {number} depth - confirmation depth at which blocks are yielded
 * @param {number[]} chainIds - array of chainIds from which blocks are included
 * @param {blockCallback} callback - function that is called for each update
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @returns the event source object the backs the stream
 */
const chainUpdates = (depth, chainIds, callback, network, host) => {
    let bs = {};
    chainIds.forEach(x => bs[x] = new HeaderBuffer(depth, callback));
    return headerUpdates(
        hdr => (bs[hdr.header.chainId] == null || bs[hdr.header.chainId].add == null) ? undefined : bs[hdr.header.chainId].add(hdr),
        network,
        host
    );
}

/* ************************************************************************** */
/* Headers */

/**
 * Headers from a range of block heights
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {number} start - start block height
 * @param {number} end - end block height
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Array of block headers in ascending order.
 *
 * @alias module:chainweb.header.range
 */
const headers = async (chainId, start, end, network, host) => {
    return await currentBranch(chainId, start, end, null, 'json', network, host);
}

/**
 * Recent Headers
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {number} depth - confirmation depth. Only headers at this depth are returned
 * @param {number} n - maximual number of headers that are returned. The actual number of returned headers may be lower.
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Array of headers in ascending order.
 *
 * @alias module:chainweb.header.recent
 */
const recentHeaders = async (chainId, depth = 0, n = 1, network, host) => {
    const cut = await currentCut(network, host);
    const start = cut.hashes['0'].height - depth - n + 1;
    const end = cut.hashes['0'].height - depth;
    const upper = cut.hashes[`${chainId}`].hash;
    return await branch(chainId, [upper], [], start, end, n, 'json', network, host);
}

/**
 * Callback for processing individual items of a header stream
 *
 * @callback headerCallback
 * @param {Object} header - header object
 */

/**
 * Apply callback to new header.
 *
 * @param {number} depth - confirmation depth at which blocks are yielded
 * @param {number[]} chainIds - array of chainIds from which blocks are included
 * @param {blockCallback} callback - function that is called for each header
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @returns the event source object the backs the stream
 *
 * @alias module:chainweb.header.stream
 */
const headerStream = (depth, chainIds, callback, network, host) => {
    return chainUpdates(depth, chainIds, u => callback(u.header), network, host);
}

/* No guarantee on order
 */
const headerStreamSince = (start, depth, chainId, callback, network, host) => {

    // loop while (streamStart == null || a < streamStart)
    let a = start - 1;
    const streamStart = null;

    // find recent upper bound (cur - depth)
    // initialize header buffer (disabled check for continuous blocks)
    // make sure to insert start as first item
    // query entries for each gap that is smaller than streamStart
    // start catching up to upper bound

    // stream
    const hdrs1p = headerStream(depth, [chainId], callback, network, host);

    // catch up to the first block of the stream
    while (streamStart == null || a < streamStart - 1) {

        const hdrs0p = headers(chainId, start, null, network, host)
            .then(x => { callback(x); a = Math.max(a, x.height); });
    }

    // release stream
    return chainUpdates(depth, chainIds, u => callback(u.header), network, host);
}

/**
 * Query block header by its block hash
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string} hash - block hash
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Block header with the requested hash
 *
 * @alias module:chainweb.header.hash
 */
const headerByBlockHash = async (chainId, hash, network, host) => {
    const x = await branch(chainId, [hash], [], null, null, 1, null, network, host, null);
    return x[0];
}

/**
 * Query block header by its height
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string} hash - block height
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Block header at the requested height
 *
 * @alias module:chainweb.header.height
 */
const headerByHeight = async (chainId, height, network, host) => {
    const x = await headers(chainId, height, height, network, host);
    return x[0];
}

/* ************************************************************************** */
/* Blocks */

/**
 * Utility function for collecting the payloads with outputs for a set
 * of headers from the same chain.
 *
 * TODO: Currently all blocks must be from the same chain. We should support
 * blocks from different chains.
 *
 * TODO: The use of this function below is inefficient. It would be better
 * to start fetching payloads asynchronously while iterating through
 * block header pages.
 */
const headers2blocks = async (hdrs, network, host, retryOptions) => {
    let missing = hdrs;
    const result = [];

    while (missing.length > 0) {

        const chainId = hdrs[0].chainId;
        const pays = await payloads(
            chainId,
            hdrs.map(x => x.payloadHash),
            'json',
            network,
            host,
            retryOptions
        );

        // Note that in worst case a server may return only one payload at a time thus starving the
        // client. Well, chainweb nodes don't behave that way :-)
        if (pays.length === 0) {
            throw new Error (`failed to get payloads for some headers. Missing ${missing.map(h => ({ hash: h.hash, height: h.height}))}`);
        }

        // index payloads by payloadHash
        const paysMap = pays.reduce((m, c) => { m[c.payloadHash] = c; return m; }, {});

        // assign payload to headers
        missing = missing.filter((hdr, i) => {
            const pay = paysMap[hdr.payloadHash];
            if (pay) {
                result.push({
                    header: hdr,
                    payload: pay
                });
                return false;
            } else {
                return true;
            }
        });
    }
    return result;
}

/**
 * Blocks from a range of block heights
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {number} start - start block height
 * @param {number} end - end block height
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Array of blocks
 *
 * @alias module:chainweb.block.range
 */
const blocks = async (chainId, start, end, network, host) => {
    let hdrs = await headers(chainId, start, end, network, host);
    return headers2blocks(hdrs, network, host);
}

/**
 * Recent Blocks
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {number} depth - confirmation depth. Only blocks at this depth are returned
 * @param {number} n - maximual number of blocks that are returned. The actual number of returned blocks may be lower.
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Array of blocks
 *
 * @alias module:chainweb.block.recent
 */
const recentBlocks = async (chainId, depth = 0, n = 1, network, host) => {
    let hdrs = await recentHeaders(chainId, depth, n, network, host);
    let ro = {}
    if (depth <= 1) {
        ro = { retry404: true, minTimeout: 1000 };
    }
    return headers2blocks(hdrs, network, host, ro);
}

/**
 * Callback for processing individual items of a block stream
 *
 * @callback blockCallback
 * @param {Object} block - block object
 */

/**
 * Apply callback to new blocks.
 *
 * @param {number} depth - confirmation depth at which blocks are yielded
 * @param {number[]} chainIds - array of chainIds from which blocks are included
 * @param {blockCallback} callback - function that is called for each block
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @returns the event source object the backs the stream
 *
 * @alias module:chainweb.stream.stream
 */
const blockStream = (depth, chainIds, callback, network, host) => {
    const ro = depth > 1 ? {} : { retry404: true, minTimeout: 1000 };
    const cb = hdr => {
        headers2blocks([hdr], network, host, ro)
        .then(blocks => callback(blocks[0]))
        .catch(err => console.log(err));
    };
    return headerStream(depth, chainIds, cb, network, host);
}

/**
 * Query block header by its block hash
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string} hash - block hash
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Block with the requested hash
 *
 * @alias module:chainweb.block.hash
 */
const blockByBlockHash = async (chainId, hash, network, host) => {
    const hdr = await headerByBlockHash(chainId, hash, network, host);
    const bs = await headers2blocks([hdr], network, host);
    return bs[0];
}

/**
 * Query block by its height
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string} hash - block height
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Block at the requested height
 *
 * @alias module:chainweb.block.height
 */
const blockByHeight = async (chainId, height, network, host) => {
    const x = await blocks(chainId, height, height, network, host);
    return x[0];
}

/* ************************************************************************** */
/* Transactions */

/**
 * Utility function to filter the transactions from an array of blocks
 */
const filterTxs = (blocks) => {
    return blocks
        .filter(x => x.payload.transactions.length > 0)
        .flatMap(x => {
            let txs = x.payload.transactions;
            txs.forEach(tx => tx.height = x.header.height);
            return txs;
        });
}

/**
 * Transactions from a range of block heights
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {number} start - start block height
 * @param {number} end - end block height
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Array of transactions
 *
 * @alias module:chainweb.transaction.range
 */
const txs = async (chainId, start, end, network, host) => {
    const x = await blocks(chainId, start, end, network, host);
    return filterTxs(x);
}

/**
 * Recent Transactions
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {number} depth - confirmation depth. Only transactions of blocks that this depth are returned
 * @param {number} n - maximual number of blocks from which transactions are returned. The actual number of returned transactions may be lower
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Array of transactions
 *
 * @alias module:chainweb.transaction.recent
 */
const recentTxs = async (chainId, depth = 0, n = 1, network, host) => {
    const x = await recentBlocks(chainId, depth, n, network, host);
    return filterTxs(x);
}

/**
 * Callback for processing individual items of a transaction stream
 *
 * @callback transactionCallback
 * @param {Object} transaction - transaction object
 */

/**
 * Apply callback to new transactions.
 *
 * @param {number} depth - confirmation depth at which blocks are yielded
 * @param {number[]} chainIds - array of chainIds from which blocks are included
 * @param {transactionCallback} callback - function that is called for each transaction
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @returns the event source object the backs the stream
 *
 * @alias module:chainweb.transaction.stream
 */
const txStream = (depth, chainIds, callback, network, host) => {
    const ro = depth > 1 ? {} : { retry404: true, minTimeout: 1000 };
    const cb = u => {
        if (u.txCount > 0) {
            headers2blocks([u.header], network, host, ro)
            .then(blocks => filterTxs(blocks).forEach(callback))
            .catch(err => console.log(err));
        }
    };
    return chainUpdates(depth, chainIds, cb, network, host);
}

/**
 * Query transactions of a block by the block hash
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string} hash - block hash
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Transactions from the block with the requested hash
 *
 * @alias module:chainweb.transaction.hash
 */
const txsByBlockHash = async (chainId, hash, network, host) => {
    const block = await blockByBlockHash(chainId, hash, network, host)
    return filterTxs([block]);
}

/**
 * Query transactions by height
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string} hash - block height
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Transactions from the block of the requested height
 *
 * @alias module:chainweb.transaction.height
 */
const txsByHeight = async (chainId, height, network, host) =>
    txs(chainId, height, height, network, host);

/* ************************************************************************** */
/* Events */

/**
 * Utility function to filter the events from an array of blocks
 */
const filterEvents = (blocks) => {
    return blocks
        .filter(x => x.payload.transactions.length > 0)
        .flatMap(x => x.payload.transactions.flatMap(y => {
            let es = y.output.events ? y.output.events : [];
            es.forEach(e => e.height = x.header.height);
            return es;
        }));
}

/**
 * Events from a range of block heights
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {number} start - start block height
 * @param {number} end - end block height
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Array of events
 *
 * @alias module:chainweb.transaction.range
 */
const events = async (chainId, start, end, network, host) => {
    const x = await blocks(chainId, start, end, network, host);
    return filterEvents(x);
}

/**
 * Recent Events
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {number} depth - confirmation depth. Only events of blocks that this depth are returned
 * @param {number} n - maximual number of blocks from which events are returned. The actual number of returned events may be lower.
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Array of Pact events
 *
 * @alias module:chainweb.event.recent
 */
const recentEvents = async (chainId, depth = 0, n = 1, network, host) => {
    const x = await recentBlocks(chainId, depth, n, network, host);
    return filterEvents(x);
}

/**
 * Callback for processing individual items of an event stream
 *
 * @callback eventCallback
 * @param {Object} event - event object
 */

/**
 * Apply callback to new events.
 *
 * @param {number} depth - confirmation depth at which blocks are yielded
 * @param {number[]} chainIds - array of chainIds from which blocks are included
 * @param {eventCallback} callback - function that is called for each event
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @returns the event source object the backs the stream
 *
 * @alias module:chainweb.event.stream
 */
const eventStream = (depth, chainIds, callback, network, host) => {
    const ro = depth > 1 ? {} : { retry404: true, minTimeout: 1000 };
    const cb = u => {
        if (u.txCount > 0) {
            headers2blocks([u.header], network, host, ro)
            .then(blocks => filterEvents(blocks).forEach(callback))
            .catch(err => console.log(err));
        }
    };
    return chainUpdates(depth, chainIds, cb, network, host);
}

/**
 * Query events of a block by the block hash
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string} hash - block hash
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Events from the block with the requested hash
 *
 * @alias module:chainweb.event.hash
 */
const eventsByBlockHash = async (chainId, hash, network, host) => {
    const block = await blockByBlockHash(chainId, hash, network, host)
    return filterEvents([block]);
}

/**
 * Query Events by height
 *
 * @param {number|string} chainId - a chain id that is valid for the network
 * @param {string} hash - block height
 * @param {string} [network="mainnet01"] - chainweb network
 * @param {string} [host="https://api.chainweb.com"] - chainweb api host
 * @return {Promise} Events from the block of the requested height
 *
 * @alias module:chainweb.event.height
 */
const eventsByHeight = async (chainId, height, network, host) =>
    events(chainId, height, height, network, host);

/* ************************************************************************** */
/* Module Exports */

module.exports = {
    ResponseError: ResponseError,

    /**
     * @namespace
     */
    cut: {
        current: currentCut,
        peers: cutPeers
    },
    /**
     * @namespace
     */
    header: {
        range: headers,
        recent: recentHeaders,
        stream: headerStream,
        height: headerByHeight,
        blockHash: headerByBlockHash,
    },
    /**
     * @namespace
     */
    block: {
        range: blocks,
        recent: recentBlocks,
        stream: blockStream,
        height: blockByHeight,
        blockHash: blockByBlockHash,
    },
    /**
     * @namespace
     */
    transaction: {
        range: txs,
        recent: recentTxs,
        stream: txStream,
        height: txsByHeight,
        blockHash: txsByBlockHash,
    },
    /**
     * @namespace
     */
    event: {
        range: events,
        recent: recentEvents,
        stream: eventStream,
        height: eventsByHeight,
        blockHash: eventsByBlockHash,
    },

    /**
     * Internal Utilities
     *
     * Anything that is exported within the `internal` namespace
     * is not covered by semantic versioning policy.
     *
     * @namespace
     */
    internal: {
        branchPage: branchPage,
        branch: branch,
        currentBranch: currentBranch,
        payloads: payloads,
        cutPeerPage: cutPeerPage,
    }
};
