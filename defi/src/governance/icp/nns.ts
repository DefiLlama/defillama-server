import axios from 'axios'
import { Proposal } from '../types';
import { updateStats } from '../utils';
import { setCompound, getCompound } from '../cache';
import { update_nervous_system_cache, NervousSystemConfig } from './icp';

// Number of decimals that are supported by the governance canister
export const DECIMALS : number = 1e8;

// Proposals with these topics should not be included in the data fetched
export const EXCLUDED_TOPICS = [ "TOPIC_EXCHANGE_RATE", "TOPIC_NEURON_MANAGEMENT" ];

// Id of the NNS proposals stored in cache
export const NNS_GOV_ID = 'icp-nns'

// URLs for fetching NNS data
export const NNS_API_BASE_URL : string = "https://ic-api.internetcomputer.org/api/v3/";
export const DASHBOARD_BASE_URL : string = "https://dashboard.internetcomputer.org/proposal/";
export const ICP_LEDGER_API_BASE_URL : string = "https://ledger-api.internetcomputer.org/";

// Proposal response onject from the NNS data API
export interface NetworkNervousSystemProposalResponse
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

    let latest_proposal_id = data.latest_proposal_id;
    var { data, status } = await axios.get(
        ICP_LEDGER_API_BASE_URL + "supply/total/latest"
        ,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    );  
    const token_supply = Math.floor(data[1]/DECIMALS);

    return {
        // NNS Governance canister id
        // id: "rrkah-fqaaa-aaaaa-aaaaq-cai",
        id: NNS_GOV_ID,
        type: "Network Nervous System",
        latestProposalId: latest_proposal_id,
        proposalsCount:latest_proposal_id,
        symbol: "NNS",
        chainName: "Internet Computer",
        name: "Network Nervous System",
        tokens: [ {
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
 * Converts the proposals fetched from the NNS Proposal API to the proposal format used in this repo
 * @param {NetworkNervousSystemProposalResponse} proposal
 * @returns {Proposal}
 */
export function convert_proposal_format ( proposal : NetworkNervousSystemProposalResponse,config:NervousSystemConfig ) : Proposal
{
    return {
        id: proposal.proposal_id.toString(),
        title: proposal.title ? proposal.title : proposal.topic,
        state: proposal.status,
        app: config.app,
        description: proposal.summary,
        space: { canister_id: config.governance_canister_id },
        choices: [ "Yes", "No", "Undecided" ],
        scores: [ proposal.latest_tally.yes, proposal.latest_tally.no, proposal.latest_tally.total - proposal.latest_tally.yes - proposal.latest_tally.no ].map( i => i / config.decimals ),
        scores_total: proposal.latest_tally.total / config.decimals,
        quorum: 0.03,
        votes: 0,
        score_skew: 0,
        score_curve: 0,
        score_curve2: 0,
        start: proposal.proposal_timestamp_seconds,
        end: proposal.latest_tally.timestamp_seconds,
        executed: proposal.status === 'EXECUTED',
        link: config.dashboard_url? config.dashboard_url + proposal.proposal_id.toString():""
    };
}

export async function addICPProposals ( overview : any = {} )
{
    let cache = await getCompound( NNS_GOV_ID )
    cache.metadata = {
        ...cache.metadata,
        ...
        await get_metadata()
    };

    let config:NervousSystemConfig = {
        app:"Internet Computer",
        governance_canister_id:"rrkah-fqaaa-aaaaa-aaaaq-cai",
        ns_api_url:NNS_API_BASE_URL,
        dashboard_url:DASHBOARD_BASE_URL,
        ledger_url:ICP_LEDGER_API_BASE_URL,
        latest_proposal_id: cache.metadata.latestProposalId,
        decimals:DECIMALS,
        convert_proposals:convert_proposal_format,
        proposal_filter:(p:NetworkNervousSystemProposalResponse) => p.topic ? !EXCLUDED_TOPICS.includes( p.topic ) : false,
        excluded_topics:EXCLUDED_TOPICS
    };
    await update_nervous_system_cache( cache as any ,config)
    cache.metadata.proposalsCount = Object.keys(cache.proposals).length
    cache.id = NNS_GOV_ID
    updateStats( cache, overview, cache.id )
    if ( overview[ cache.id ] )
    {
        Object.values( overview[ cache.id ].months ?? {} ).forEach( ( month : any ) => delete month.proposals )
    }
    if ( cache.stats?.highestTotalScore > 1e14 ) cache.stats /= DECIMALS
    await setCompound( cache.id, cache )
    return overview
}