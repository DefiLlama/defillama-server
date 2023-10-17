import axios from 'axios'
import { GovCache, Proposal } from './types';
import { PromisePool } from "@supercharge/promise-pool";
import { updateStats } from './utils';
import { setCompound, getCompound } from './cache';

const MAX_PROPOSALS_PER_REQUEST : number = 100;

// Number of decimals that are supported by the governance canister
const DECIMALS : number = 1e8;

// The maximum number representation of u64
const U64_MAX : number = 18446744073709551615;

// Id of the NNS proposals stored in cache
const GOV_ID = 'icp'

// Proposals with these topics should not be included in the data fetched
export const EXCLUDED_TOPICS = [ "TOPIC_EXCHANGE_RATE", "TOPIC_NEURON_MANAGEMENT" ];

// URLs for fetching NNS data
const NNS_API_BASE_URL : string = "https://ic-api.internetcomputer.org/api/v3/";
const DASHBOARD_BASE_URL : string = "https://dashboard.internetcomputer.org/proposal/";
const ICP_LEDGER_METRICS_URL : string = "https://ryjl3-tyaaa-aaaaa-aaaba-cai.raw.ic0.app/metrics";

// Proposal response onject from the NNS data API
export interface NnsProposalResponse
{
    action : string,
    action_nns_function : string,
    deadline_timestamp_seconds : number,
    decided_timestamp_seconds : number,
    executed_timestamp_seconds : number,
    failed_timestamp_seconds : number,
    id : number,
    "latest_tally" : {
        "no" : number,
        "timestamp_seconds" : number,
        "total" : number,
        "yes" : number
    },
    "payload" : any,
    proposal_id : number,
    proposal_timestamp_seconds : number,
    proposer : string,
    reject_cost_e8s : number,
    reward_status : string,
    settled_at : null,
    status : string,
    summary : string,
    title : string,
    topic : string,
    updated_at : string,
    url : string
}

/**
 * Returns metadata for the NNS on the internet computer
 * @returns {{ [key: string]: any }}
 */
export async function get_metadata ()
{
    var { data, status } = await axios.get(
        NNS_API_BASE_URL + "metrics/latest-proposal-id"
        ,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    );
    let lates_proposal_id = data.latest_proposal_id;
    var { data, status } = await axios.get(
        ICP_LEDGER_METRICS_URL
        ,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    );

    // The metrics endpoint of the ICP ledger returns a string with metrics separated by a line break with each line having the format: NAME_OF_METRIC METRIC_VALUE \n
    const metrics_lines = data.split( '\n' );
    // The line we are looking for has the metric name 'ledger_balances_token_pool'
    var substring = "ledger_balances_token_pool";
    // Now we can extract that line and select the metric value
    const token_supply = Math.floor( 18446744073709551615 / DECIMALS - parseInt( metrics_lines.find( ( line : string ) => line.startsWith( substring ) ).split( ' ' )[ 1 ] ) );

    return {
        // NNS Governance canister id
        id: "rrkah-fqaaa-aaaaa-aaaaq-cai",
        type: "Network Nervous System",
        proposalsCount: lates_proposal_id,
        symbol: "NNS",
        chainName: "Internet Computer",
        name: "Network Nervous System",
        tokes: [ {
            // NNS ICP ledger canister id
            id: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            type: "ICRC-1 Ledger",
            name: "Network Nervous System Internet Computer Protocol Ledger",
            symbol: "NNS ICP Ledger",
            supply: token_supply.toString(),
            decimals: DECIMALS.toString(),
        } ]
    }
}

/**
 * Returns an array of NNS proposals. The parameter limit states the number of proposals to be 
 * fetched starting from the proposal with the highest proposal id.
 * The offset parameter states the offset from the proposal with the highest proposal id.
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Proposal[]>}
 */
export async function get_proposals_interval ( limit : number, offset : number ) : Promise<NnsProposalResponse[]>
{
    const nns_url : string = NNS_API_BASE_URL + `proposals?limit=${ limit >= MAX_PROPOSALS_PER_REQUEST ? MAX_PROPOSALS_PER_REQUEST : limit }&offset=${ offset }`
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
 * Returns a NNS proposal given its proposal id.
 * @param {number} proposal_id
 * @returns {Promise<Proposal>}
 */
export async function get_nns_proposal ( proposal_id : number ) : Promise<NnsProposalResponse>
{
    const nns_url : string = NNS_API_BASE_URL + `proposals/${ proposal_id }`

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
 * Converts the proposals fetched from the NNS Proposal API to the proposal format used in this repo
 * @param {NnsProposalResponse} proposal
 * @returns {Proposal}
 */
export function convert_proposal_format ( proposal : NnsProposalResponse ) : Proposal
{
    return {
        id: proposal.proposal_id.toString(),
        title: proposal.title ? proposal.title : proposal.topic,
        state: proposal.status,
        app: "Internet Computer",
        description: proposal.summary,
        space: { canister_id: "rrkah-fqaaa-aaaaa-aaaaq-cai" },
        choices: [ "Yes", "No", "Undecided" ],
        scores: [ proposal.latest_tally.yes, proposal.latest_tally.no, proposal.latest_tally.total - proposal.latest_tally.yes - proposal.latest_tally.no ].map( i => i / DECIMALS ),
        scores_total: proposal.latest_tally.total / DECIMALS,
        quorum: 0.03,
        votes: 0,
        score_skew: 0,
        score_curve: 0,
        score_curve2: 0,
        start: proposal.proposal_timestamp_seconds,
        end: proposal.latest_tally.timestamp_seconds,
        executed: proposal.status === 'EXECUTED',
        link: DASHBOARD_BASE_URL + proposal.proposal_id.toString()
    };
}


/**
 * Given a Government Cache instance this function checks whether there are any new proposals missing 
 * from the cache and updates open proposals withing the last 12 weeks.
 * @param {GovCache} cache
 * @returns {Promise<GovCache>}
 */
export async function update_internet_computer_cache ( cache : GovCache ) : Promise<GovCache>
{
    // Update recent proposals
    cache = await update_recent_proposals( cache );

    const { data, status } = await axios.get(
        NNS_API_BASE_URL + 'metrics/latest-proposal-id'
        ,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    );
    let latest_nns_proposal_id = data.latest_proposal_id
    let nns_proposals_in_cache : string[] = Object.keys( cache.proposals );
    nns_proposals_in_cache.reverse();
    const latest_nns_proposal_in_cache = nns_proposals_in_cache.reduce( ( a : any, b : any ) => a > +b ? a : b, 3 )

    // The proposals 0-2 are nor available => the lowest proposal id is 3
    let proposal_left_to_fetch = latest_nns_proposal_id - latest_nns_proposal_in_cache;

    // Keep fetching proposals as long as there are proposals left to be fetched
    while ( proposal_left_to_fetch > 0 )
    {
        // The maximum number of proposals is limited by the NNS
        let limit = Math.min( MAX_PROPOSALS_PER_REQUEST, proposal_left_to_fetch );

        // The starting point of the interval is the lowest proposal id that has not yet been fetched plus the range length
        let offset = proposal_left_to_fetch - limit;
        ( await get_proposals_interval( limit, offset ) ).filter( ( p : NnsProposalResponse ) => p.topic ? !EXCLUDED_TOPICS.includes( p.topic ) : false )
            .forEach( ( nns_p : NnsProposalResponse ) => { let p : Proposal = convert_proposal_format( nns_p ); cache.proposals[ p.id ] = p; } );

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
async function update_recent_proposals ( cache : GovCache ) : Promise<GovCache>
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
                let proposal_response : NnsProposalResponse = await get_nns_proposal( parseInt( key ) );
                // Check for the topic of the proposal. Only include those which are not set to be excluded. 
                if ( proposal_response.topic ? !EXCLUDED_TOPICS.includes( proposal_response.topic ) : false )
                {
                    cache.proposals[ key ] = convert_proposal_format( proposal_response );
                }
            }
        } );

    Object.values( cache.proposals ).forEach( ( i : any ) =>
    {
        if ( i?.scores_total > 1e14 )
        {
            i.scores_total /= DECIMALS
            if ( i.scores )
            {
                i.scores = i.scores.map( ( j : any ) => j / DECIMALS )
            }
        }
    } )
    return cache;
}


export async function addICPProposals ( overview : any = {} )
{
    let cache = await getCompound( GOV_ID )
    await update_internet_computer_cache( cache as any )
    cache.metadata = {
        ...cache.metadata,
        ...
        await get_metadata()
    };

    cache.id = GOV_ID
    updateStats( cache, overview, cache.id )
    if ( overview[ cache.id ] )
    {
        Object.values( overview[ cache.id ].months ?? {} ).forEach( ( month : any ) => delete month.proposals )
    }
    if ( cache.stats?.highestTotalScore > 1e14 ) cache.stats /= DECIMALS
    await setCompound( cache.id, cache )
    return overview
}