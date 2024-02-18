import axios from 'axios'
import { GovCache, Proposal } from '../types';
import { PromisePool } from "@supercharge/promise-pool";
import * as sdk from '@defillama/sdk'
export const MAX_PROPOSALS_PER_REQUEST : number = 100;

// The maximum number representation of u64
const U64_MAX : number = 18446744073709551615;

// A config file passed to the functions of this file to mitigate the differences between NNSes and SNSes 
export interface NervousSystemConfig
{
    app : string;
    ledger_url : string;
    dashboard_url ?: string;
    ns_api_url : string;
    governance_canister_id : string;
    latest_proposal_id : number;
    decimals : number;
    convert_proposals : ( p : any, config : NervousSystemConfig ) => Proposal;
    proposal_filter : ( p : any ) => boolean;
    excluded_topics : string[];
}

/**
 * Returns an array of Nervous System proposals. The parameter limit states the number of proposals to be 
 * fetched starting from the proposal with the highest proposal id.
 * The offset parameter states the offset from the proposal with the highest proposal id.
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Proposal[]>}
 */
export async function get_proposals_interval ( limit : number, offset : number, config : NervousSystemConfig ) : Promise<any[]>
{

    const nns_url : string = config.ns_api_url + `proposals?limit=${ limit >= MAX_PROPOSALS_PER_REQUEST ? MAX_PROPOSALS_PER_REQUEST : limit }&offset=${ offset }`
    const { data, status } = await axios.get(
        nns_url,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    );

    return data.data;
};

/**
 * Returns a Nervous System proposal given its proposal id.
 * @param {number} proposal_id
 * @returns {Promise<Proposal>}
 */
export async function get_nervous_system_proposal ( proposal_id : number, config : NervousSystemConfig ) : Promise<any>
{
    const nns_url : string = config.ns_api_url + `proposals/${ proposal_id }`

    const { data, status } = await axios.get(
        nns_url,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    );
    return data;
}

/**
 * Given a Government Cache instance this function checks whether there are any new proposals missing 
 * from the cache and updates open proposals withing the last 12 weeks.
 * @param {GovCache} cache
 * @returns {Promise<GovCache>}
 */
export async function update_nervous_system_cache ( cache : GovCache, config : NervousSystemConfig ) : Promise<GovCache>
{
    // Update recent proposals
    cache = await update_recent_proposals( cache, config );

    let latest_nns_proposal_id : number = config.latest_proposal_id
    let nns_proposals_in_cache : string[] = Object.keys( cache.proposals );
    nns_proposals_in_cache.reverse();

    // The proposals 0-2 are nor available => the lowest proposal id is 3
    const min_proposal_id = cache.id === 'icp-nns' ? 3 : 0
    const latest_nns_proposal_in_cache = nns_proposals_in_cache.reduce( ( a : any, b : any ) => a > +b ? a : b, min_proposal_id )
    let proposal_left_to_fetch = latest_nns_proposal_id - latest_nns_proposal_in_cache;
    sdk.log({ id: cache.id, latest_nns_proposal_in_cache, latest_nns_proposal_id, proposal_left_to_fetch})

    // Keep fetching proposals as long as there are proposals left to be fetched
    while ( proposal_left_to_fetch > 0 )
    {
        // The maximum number of proposals is limited by the Nervous Systems
        let limit = Math.min( MAX_PROPOSALS_PER_REQUEST, proposal_left_to_fetch );
        sdk.log({ limit, proposal_left_to_fetch, id: cache.id  })

        // The starting point of the interval is the lowest proposal id that has not yet been fetched plus the range length
        let offset = proposal_left_to_fetch - limit;
        ( await get_proposals_interval( limit, offset, config ) ).filter( ( p : any ) => config.proposal_filter( p ) )
            .forEach( ( nns_p : any ) => { let p : Proposal = config.convert_proposals( nns_p, config ); cache.proposals[ p.id ] = p; } );
        // Pump the lowest proposal id by the range length
        proposal_left_to_fetch -= limit;
    }
    return cache;
}

/**
 * Given a Government Cache this function will check all proposals in the last 12 weeks for an update in their state. 
 * Unless a prposal has reached a terminal state, it will be updated, given it was created in the past 12 weeks.
 * @param {GovCache} cache
 * @returns {Promise<GovCache>}
 */
async function update_recent_proposals ( cache : GovCache, config : NervousSystemConfig ) : Promise<GovCache>
{
    if ( !cache.proposals ) cache.proposals = {};
    // Get current UNIX timestamp in seconds
    const now = Math.floor( Date.now() / 1000 );
    // 12 weeks in seconds
    let time_frame = 12 * 7 * 24 * 60 * 60
    // There are two proposal states that are terminal
    let terminal_proposal_states = [ "EXECUTED", "FAILED", "REJECTED" ];

    // Go through all proposals in the past 12 weeks and update those which have not yet reached a terminal state
    let proposal_ids = Object.keys( cache.proposals );
    proposal_ids.reverse();

    await PromisePool.withConcurrency( 42 )
        .for( proposal_ids )
        .process( async ( key ) =>
        {
            let current_proposal = cache.proposals[ key ];
            // If the current proposal was created more than 12 weeks ago, the updating process is completed
            if ( current_proposal.start + time_frame < now )
                return

            // Only update those proposals which have not reached a terminal state yet
            if ( !terminal_proposal_states.includes( current_proposal.state ) )
            {
                let proposal_response : any = await get_nervous_system_proposal( parseInt( key ), config );
                // Check for the topic of the proposal. Only include those which are not set to be excluded. 
                if ( proposal_response.topic ? !config.excluded_topics.includes( proposal_response.topic ) : false )
                {
                    cache.proposals[ key ] = config.convert_proposals( proposal_response, config );
                }
            }
        } );

    Object.values( cache.proposals ).forEach( ( i : any ) =>
    {
        if ( i?.scores_total > 1e14 )
        {
            i.scores_total /= config.decimals
            if ( i.scores )
            {
                i.scores = i.scores.map( ( j : any ) => j / config.decimals )
            }
        }
    } )
    return cache;
}