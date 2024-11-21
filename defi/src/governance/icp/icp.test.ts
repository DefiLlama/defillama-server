
import axios from 'axios'
import { GovCache, Proposal } from '../types';
import exp from 'constants';
import { getProposals } from '../snapshot';
import { LimitOnUpdateNotSupportedError } from 'typeorm';
import { DASHBOARD_BASE_URL, DECIMALS, EXCLUDED_TOPICS, ICP_LEDGER_API_BASE_URL, NNS_API_BASE_URL, NetworkNervousSystemProposalResponse, convert_proposal_format, get_metadata } from './nns';
import { NervousSystemConfig, get_nervous_system_proposal, get_proposals_interval, update_nervous_system_cache } from './icp';

var config : NervousSystemConfig = {
    app: "Internet Computer",
    governance_canister_id: "rrkah-fqaaa-aaaaa-aaaaq-cai",
    ns_api_url: NNS_API_BASE_URL,
    dashboard_url: DASHBOARD_BASE_URL,
    ledger_url: ICP_LEDGER_API_BASE_URL,
    latest_proposal_id: 0,
    decimals: DECIMALS,
    convert_proposals: convert_proposal_format,
    proposal_filter: ( p : NetworkNervousSystemProposalResponse ) => p.topic ? !EXCLUDED_TOPICS.includes( p.topic ) : false,
    excluded_topics: EXCLUDED_TOPICS
};

describe( 'internet computer adapter ', () =>
{
    test( ( "fetching proposal by id" ), async function ()
    {
        var { data, status } = await axios.get(
            'https://ic-api.internetcomputer.org/api/v3/metrics/latest-proposal-id'
            ,
            {
                headers: {
                    Accept: 'application/json',
                },
            },
        );
        var proposals : Proposal[] = [];
        var latest_proposal_id = data.latest_proposal_id;
        config.latest_proposal_id = latest_proposal_id;
        let proposal = convert_proposal_format( await get_nervous_system_proposal( latest_proposal_id, config ), config );
        proposals.push( proposal );
        expect( proposals.length ).toBe( 1 );
        // Check the ids of the proposals are correct
        proposals.forEach( ( p : Proposal ) =>
        {
            expect( p.id ).toBe( latest_proposal_id.toString() );
        } )
    }, 100000 );
    test( ( "fetching proposal interval" ), async function ()
    {
        var { data, status } = await axios.get(
            'https://ic-api.internetcomputer.org/api/v3/metrics/latest-proposal-id'
            ,
            {
                headers: {
                    Accept: 'application/json',
                },
            },
        );
        var latest_proposal_id = data.latest_proposal_id;
        config.latest_proposal_id = latest_proposal_id;
        let proposals : NetworkNervousSystemProposalResponse[] = await get_proposals_interval( 10, 0, config );
        expect( proposals.length ).toBe( 10 );
        proposals.forEach( ( nns_p : NetworkNervousSystemProposalResponse ) =>
        {
            let p = convert_proposal_format( nns_p, config );
            expect( p.id ).toBe( latest_proposal_id.toString() );
            latest_proposal_id--;
        } )

        // Check that offset works too
        let offset = 10;
        proposals = await get_proposals_interval( 10, offset, config );
        expect( proposals.length ).toBe( 10 );
        proposals.forEach( ( nns_p : NetworkNervousSystemProposalResponse ) =>
        {
            let p = convert_proposal_format( nns_p, config );
            expect( p.id ).toBe( ( latest_proposal_id ).toString() );
            latest_proposal_id--;
        } )
    }, 100000 );
    test( ( "updating GovCache" ), async function ()
    {
        var { data, status } = await axios.get(
            'https://ic-api.internetcomputer.org/api/v3/metrics/latest-proposal-id'
            ,
            {
                headers: {
                    Accept: 'application/json',
                },
            },
        );
        var latest_proposal_id = data.latest_proposal_id;
        var latest_proposal_id = data.latest_proposal_id;
        let offset = 100;
        var cache : GovCache = {
            id: "1",
            metadata: {},
            proposals: {
            }
        };
        cache.proposals![ ( latest_proposal_id - offset ).toString() ] = {
            id: ( latest_proposal_id - offset ).toString(),
            state: "",
            app: "",
            space: "",
            scores: [],
            scores_total: 0,
            quorum: 0,
            votes: 0,
            score_skew: 0,
            score_curve: 0,
            score_curve2: 0,
            start: 0,
            end: 0,
        };
        cache = await update_nervous_system_cache( cache, config );
        let proposals = await get_proposals_interval( 100, 0, config );
        expect( Object.keys( cache.proposals ).length ).toBe( proposals.filter( ( p : NetworkNervousSystemProposalResponse ) => p.topic ? !EXCLUDED_TOPICS.includes( p.topic ) : false ).length + 1 );
    }, 100000 );

    test( ( "updating recent proposals" ), async function ()
    {
        var { data, status } = await axios.get(
            'https://ic-api.internetcomputer.org/api/v3/metrics/latest-proposal-id'
            ,
            {
                headers: {
                    Accept: 'application/json',
                },
            },
        );
        var latest_proposal_id = data.latest_proposal_id;
        config.latest_proposal_id = latest_proposal_id;
        var cache : GovCache = {
            id: "1",
            metadata: {},
            proposals: {
            }
        };
        let limit = 100;
        let proposals = await get_proposals_interval( limit, 0, config );
        proposals.forEach( ( nns_p : NetworkNervousSystemProposalResponse ) =>
        {
            let p : Proposal = convert_proposal_format( nns_p, config );
            cache.proposals[ p.id ] = p;
        } )
        expect( Object.keys( cache.proposals ).length ).toBe( limit );
        let lowest_id = latest_proposal_id - limit + 1;
        Object.keys( cache.proposals ).forEach( ( key : string ) =>
        {
            expect( key ).toBe( lowest_id.toString() );
            lowest_id++;
        } )
        cache = await update_nervous_system_cache( cache, config );
        expect( Object.keys( cache.proposals ).length ).toBe( limit );
        lowest_id = latest_proposal_id - limit + 1;
        Object.keys( cache.proposals ).forEach( ( key : string ) =>
        {
            expect( key ).toBe( lowest_id.toString() );
            lowest_id++;
        } )
    }, 100000 );

    test( ( "fetch metadata" ), async function ()
    {
        var { data, status } = await axios.get(
            'https://ic-api.internetcomputer.org/api/v3/metrics/latest-proposal-id'
            ,
            {
                headers: {
                    Accept: 'application/json',
                },
            },
        );
        var latest_proposal_id = data.latest_proposal_id;
        var metadata = await get_metadata();
        expect( metadata.id ).toBe( "rrkah-fqaaa-aaaaa-aaaaq-cai" );
    }, 100000 );
} );