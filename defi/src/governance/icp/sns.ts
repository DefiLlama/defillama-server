import axios from 'axios'
import { GovCache, Proposal } from '../types';
import { updateStats } from '../utils';
import { setCompound, getCompound } from '../cache';
import { update_nervous_system_cache, NervousSystemConfig } from './icp';
export const SNS_GOV_ID = 'icp-sns'
const getGovId = (id: string) => SNS_GOV_ID+'-'+id

// URLs for fetching SNS data
const SNS_API_BASE_URL : string = "https://sns-api.internetcomputer.org/api/v1/snses/";
const DASHBOARD_BASE_URL : string = "https://dashboard.internetcomputer.org/sns/";
const ICRC1_LEDGER_API_BASE_URL : string = "https://icrc-api.internetcomputer.org/api/v1/ledgers/";

// Proposal response object from the SNS data API
interface ServiceNervousSystemProposalResponse
{
    root_canister_id : string,
    action : string,
    decided_timestamp_seconds : number,
    executed_timestamp_seconds : number,
    failed_timestamp_seconds : number,
    id : number,
    latest_tally : {
        "no" : number,
        "timestamp_seconds" : number,
        "total" : number,
        "yes" : number
    },
    reward_event_end_timestamp_seconds ?: string,
    initial_voting_period_seconds : number,
    is_eligible_for_rewards : boolean,
    proposal_action_payload : any,
    proposal_action_type : string,
    proposal_title : string,
    proposal_url : string,
    proposal_creation_timestamp_seconds : number,
    proposer : string,
    reject_cost_e8s : number,
    failure_reason : any,
    payload_text_rendering : string,
    summary : string,
    reward_event_round : number,
    wait_for_quiet_deadline_increase_seconds : number,
    wait_for_quiet_state_current_deadline_timestamp_seconds : number,
    status : string,
    reward_status : string,
    nervous_system_function : {
        id : string,
        name : string,
        description : string,
        function_type : any
    }
    votes : string
}

// Metadata specific to a single SNS
interface SnsMetadata
{
    "ledger_canister_id" : string;
    "sns_root_canister_id" : string;
    "icrc1_metadata" : {
        "icrc1_fee" : string;
        "icrc1_name" : string;
        "icrc1_logo" ?: string;
        "icrc1_symbol" : string;
        "icrc1_decimals" : string;
        "icrc1_total_supply" : string;
        "icrc1_max_memo_length" ?: string;
        "icrc1_minting_account" : {
            "owner" : string;
            "subaccount" ?: string;
        }
    }
}

/**
 * Returns metadata for all SNSes on the internet computer
 * @returns {Promise<SnsMetadata[]>}
 */
async function get_sns_metadata () : Promise<SnsMetadata[]>
{
    var { data, status } = await axios.get(
        ICRC1_LEDGER_API_BASE_URL + "?offset=0&limit=100"
        ,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    );
    return data.data;
}

/**
 * Converts the proposals fetched from the SNS Proposal API to the proposal format used in this repo
 * @param {NervousSystemProposalResponse} proposal
 * @returns {Proposal}
 */
function convert_proposal_format ( proposal : ServiceNervousSystemProposalResponse, config : NervousSystemConfig ) : Proposal
{
    return {
        id: proposal.id.toString(),
        title: proposal.proposal_title ? proposal.proposal_title : proposal.proposal_action_type,
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
        start: proposal.proposal_creation_timestamp_seconds,
        end: proposal.latest_tally.timestamp_seconds,
        executed: proposal.status === 'EXECUTED',
        link: config.dashboard_url ? config.dashboard_url + proposal.id.toString() : ""
    };
}

/**
 * Returns metadata for the SNS on the internet computer
 * @returns {{ [key: string]: any }}
 */
export async function get_metadata ( sns_metadata : SnsMetadata )
{
    var { data, status } = await axios.get(
        SNS_API_BASE_URL + `${ sns_metadata.sns_root_canister_id }/proposals/?offset=0&limit=1`
        ,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    );
    const lates_proposal_id = data.max_proposal_index;
    var { data, status } = await axios.get(
        SNS_API_BASE_URL + `${ sns_metadata.sns_root_canister_id }`
        ,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    );
    const name = data.name;
    const logo = data.logo;
    return {
        // SNS Governance canister id
        // id: sns_metadata.sns_root_canister_id,
        id: getGovId(sns_metadata.sns_root_canister_id),
        type: "Service Nervous System",
        proposalsCount: lates_proposal_id,
        symbol: sns_metadata.icrc1_metadata.icrc1_symbol,
        chainName: "Internet Computer",
        name: name,
        tokens: [ {
            // SNS ICRC-1 ledger canister id
            id: sns_metadata.ledger_canister_id,
            type: "ICRC-1 Ledger",
            name: sns_metadata.icrc1_metadata.icrc1_name,
            symbol: sns_metadata.icrc1_metadata.icrc1_symbol,
            supply: sns_metadata.icrc1_metadata.icrc1_total_supply.toString(),
            decimals: sns_metadata.icrc1_metadata.icrc1_decimals,
        } ],
        logo: logo
    };
}

export async function addSNSProposals ( overview : any = {} ) : Promise<GovCache[]>
{
    let configs = await get_sns_metadata();
    for ( let i = 0; i < configs.length; i++ )
    {
        let sns_config : SnsMetadata = configs[ i ];
        if ( sns_config.sns_root_canister_id )
        {
            let metadata = await get_metadata( sns_config );
            let nconf : NervousSystemConfig = {
                app: "Internet Computer",
                governance_canister_id: "rrkah-fqaaa-aaaaa-aaaaq-cai",
                ns_api_url: SNS_API_BASE_URL + `${ sns_config.sns_root_canister_id }/`,
                dashboard_url: DASHBOARD_BASE_URL + `${ sns_config.sns_root_canister_id }/proposal/`,
                ledger_url: ICRC1_LEDGER_API_BASE_URL,
                latest_proposal_id: ( await get_metadata( sns_config ) ).proposalsCount,
                decimals: parseInt( metadata.tokens[ 0 ].decimals ),
                convert_proposals: convert_proposal_format,
                proposal_filter: () => true,
                excluded_topics: []
            };
            let cache : GovCache = await getCompound( metadata.id );
            cache.metadata = {
                ...cache.metadata,
                ...
                metadata
            };
            cache.id = metadata.id;
            await update_nervous_system_cache( cache as any, nconf );

            updateStats( cache, overview, cache.id )
            if ( overview[ cache.id ] )
            {
                Object.values( overview[ cache.id ].months ?? {} ).forEach( ( month : any ) => delete month.proposals )
            }
            await setCompound( cache.id, cache )
        }
    }


    return overview
}