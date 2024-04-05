import axios from 'axios'
import { Proposal, GovCache } from '../types';
import { updateStats } from '../utils';
import { setCompound, getCompound, getCompoundOverview } from '../cache';

export const TAGGR_URL: string = "https://6qfxa-ryaaa-aaaai-qbhsq-cai.raw.icp0.io/";
export const TAGGR_ID: string = "6qfxa-ryaaa-aaaai-qbhsq-cai";

export type Reward = {
    receiver: string;
    votes: [number, number][];
    minted: number;
};

export type Release = {
    commit: string;
    hash: string;
};

export type ICP = {
    e8s: bigint;
};

export type Payload =
    | { ["Noop"]: any }
    | {
          ["Release"]: Release;
      }
    | {
          ["Fund"]: [string, number];
      }
    | {
          ["ICPTransfer"]: [number[], ICP];
      }
    | {
          ["AddRealmController"]: [number, number];
      }
    | {
          ["Reward"]: Reward;
      };

function stringifyPayload(payload: Payload) {
    const type = Object.keys(payload)[0];
    const data = Object.values(payload)[0]
    let description = `Payload type: ${type}\n`;

    switch (type) {
        case "Noop":
            description += "No operation";
            break;
        case "Release":
            description += `Release commit: ${data.commit}, hash: ${data.hash}`;
            break;
        case "Fund":
            description += `Funding recipient: ${data[0]}, amount: ${data[1]}`;
            break;
        case "ICPTransfer":
            description += `ICP transfer: ${data[1].e8s} e8s to ${data[0].join(", ")}`;
            break;
        case "AddRealmController":
            description += `Adding controller ${data[1]} to realm ${data[0]}`;
            break;
        case "Reward":
            description += `Rewarding ${data.receiver} with ${data.minted} tokens for votes: ${JSON.stringify(data.votes)}`;
            break;
        default:
            description += "Unknown payload type";
    }

    return description;
}
    

export interface TaggrProposalReponse {
    id: number;
    proposer: number;
    timestamp: bigint;
    post_id: number;
    status: "Open" | "Rejected" | "Executed" | "Cancelled";
    payload: Payload;
    bulletins: [number, boolean, number][];
    voting_power: number;
};

/**
 * Returns metadata for Taggr.
 * @returns {{ [key: string]: any }}
 */
export async function get_metadata ()
{
   var { data, } = await axios.get(
        TAGGR_URL + "/api/v1/metadata"
        ,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    ); 
    return {
        id: TAGGR_ID,
        type: "Taggr DAO",
        latestProposalId: data.latest_proposal_id,
        proposalsCount: data.proposal_count,
        symbol: "TAGGR",
        chainName: "Internet Computer",
        name: "Taggr",
        tokens: [ {
            // Taggr ledger canister id
            id: TAGGR_ID,
            type: "ICRC-1 Ledger",
            name: data.token_name,
            symbol: data.symbol,
            supply: data.token_supply?.toString(),
            decimals: data.decimals?.toString(),
        } ]
    }
}

function convert_proposal_format ( proposal : TaggrProposalReponse ) : Proposal
{
    let sumTrue = 0;
    let sumFalse = 0;

    proposal.bulletins.forEach(bulletin => {
        if (bulletin[1]) {
            sumTrue += bulletin[2]; // Add score for true
        } else {
            sumFalse += bulletin[2]; // Add score for false
        }
    });

    const timestamp = Math.floor(+proposal.timestamp.toString()/ 1e9) 
    
    return {
        id: proposal.id.toString(),
        title: Object.keys(proposal.payload)[0].toString(),
        state: proposal.status,
        app: "Taggr",
        author: "https://taggr.link/#/journal/" + proposal.proposer.toString(), 
        description: stringifyPayload(proposal.payload),
        space: { canister_id: TAGGR_ID },
        choices: [ "Yes", "No"],
        scores: [ sumTrue, sumFalse],
        scores_total: sumTrue + sumFalse,
        quorum: 0.03,
        votes: proposal.voting_power,
        score_skew: 0,
        score_curve: 0,
        score_curve2: 0,
        start: timestamp,
        end: timestamp + 1,
        executed: proposal.status === 'Executed',
        link: "https://taggr.link/#/post/" + proposal.post_id
    };
}

/**
 * Returns an array of Nervous System proposals. The parameter limit states the number of proposals to be 
 * fetched starting from the proposal with the highest proposal id.
 * The offset parameter states the offset from the proposal with the highest proposal id.
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Proposal[]>}
 */
export async function get_proposals_interval ( limit : number, offset : number ) : Promise<any[]>
{

    const url : string = TAGGR_URL + `api/v1/proposals?limit=${ limit }&offset=${ offset }`
    const { data, status } = await axios.get(
        url,
        {
            headers: {
                Accept: 'application/json',
            },
        },
    );

    return data;
};

export async function addTaggrProposals ( overview : any = {} ) : Promise<GovCache[]>
{
    let metadata = await get_metadata();
    let cache : GovCache = await getCompound( TAGGR_ID );
    cache.metadata = {
        ...cache.metadata,
        ...metadata
    };
    cache.id = metadata.id;

    if (!metadata.latestProposalId) return overview
    cache.proposals = cache.proposals ?? {};

    const cached_proposals_count = Object.keys(cache.proposals ?? {}).length;
    let proposal_left_to_fetch = metadata.latestProposalId - cached_proposals_count;
    const MAX_PROPOSALS_PER_REQUEST : number = 100;


    while (proposal_left_to_fetch > 0) {
        let limit = Math.min( MAX_PROPOSALS_PER_REQUEST, proposal_left_to_fetch );
        let offset = proposal_left_to_fetch - limit;

        ( await get_proposals_interval( limit, offset ) )
            .forEach( ( fetched_proposal : any ) => { cache.proposals[ fetched_proposal.id ] = convert_proposal_format(fetched_proposal); } );
        proposal_left_to_fetch -= limit;
    }

    updateStats( cache, overview, cache.id )
    if ( overview[ cache.id ] )
    {
        Object.values( overview[ cache.id ].months ?? {} ).forEach( ( month : any ) => delete month.proposals )
    }
    // fs.writeFileSync('compound-taggr.json', JSON.stringify(cache, null, 2))
    await setCompound( cache.id, cache )

    return overview
}



process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    })
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception thrown', error)
})


/* 
import * as fs from 'fs'
getCompoundOverview().then(async i => {
    await addTaggrProposals(i)
    console.log('hello')
    fs.writeFileSync('compound-overview.json', JSON.stringify(i, null, 2))
  }).then(() => process.exit(0))
 */