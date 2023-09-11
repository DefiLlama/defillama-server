
import axios from 'axios'
import { GovCache, Proposal } from './types';
import { EXCLUDED_TOPICS, get_nns_proposal, get_proposals_interval, update_internet_computer_cache } from './icp';
import exp from 'constants';
import { getProposals } from './snapshot';
import { LimitOnUpdateNotSupportedError } from 'typeorm';

describe ('internet computer adapter ', () => {
    test(("fetching proposal by id"),async function() {
        var { data, status } = await axios.get(
            'https://ic-api.internetcomputer.org/api/v3/metrics/latest-proposal-id'
            ,
            {
              headers: {
                Accept: 'application/json',
              },
            },
          );
          var proposals:Proposal[]=[];
          var latest_proposal_id = data.latest_proposal_id;
            let proposal = await get_nns_proposal(latest_proposal_id);
            proposals.push(proposal);
          expect(proposals.length).toBe(1);
          // Check the ids of the proposals are correct
          proposals.forEach((p:Proposal)=> {
            expect(p.id).toBe(latest_proposal_id.toString());
          })
    },100000);
    test(("fetching proposal interval"),async function() {
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
          let proposals:Proposal[] = await get_proposals_interval(10,0);
          expect(proposals.length).toBe(10);
          proposals.forEach((p:Proposal)=> {
            expect(p.id).toBe(latest_proposal_id.toString());
            latest_proposal_id--;
          })

          // Check that offset works too
          let offset = 10;
          proposals = await get_proposals_interval(10,offset);
          expect(proposals.length).toBe(10);
          proposals.forEach((p:Proposal)=> {
            expect(p.id).toBe((latest_proposal_id).toString());
            latest_proposal_id--;
          })
    },100000);
    test(("updating GovCache"),async function() {
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
        let offset = 100;
        var cache:GovCache = {
            id:"1",
            metadata:{},
            proposals:{
            }
        };
        cache.proposals![(latest_proposal_id-offset).toString()] = {  id: (latest_proposal_id-offset).toString(),
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
            end: 0,};
            cache = await update_internet_computer_cache(cache);
            let proposals = await get_proposals_interval(100,0);
            expect(Object.keys(cache.proposals).length).toBe(proposals.filter((p:Proposal) => p.title?!EXCLUDED_TOPICS.includes(p.title):false).length+1);
    },100000);

    test(("updating recent proposals"),async function() {
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
      var cache:GovCache = {
        id:"1",
        metadata:{},
        proposals:{
        }
    };
        let limit = 100;
      let proposals = await get_proposals_interval(limit,0);
      proposals.forEach((p:Proposal)=> {
        cache.proposals[p.id] = p;
      })
      expect(Object.keys(cache.proposals).length).toBe(limit);
      let lowest_id = latest_proposal_id - limit + 1 ;
      Object.keys(cache.proposals).forEach((key:string)=>{
        expect(key).toBe(lowest_id.toString());
        lowest_id++;
    })
      cache = await update_internet_computer_cache(cache);
      expect(Object.keys(cache.proposals).length).toBe(limit);
      lowest_id = latest_proposal_id - limit + 1;
      Object.keys(cache.proposals).forEach((key:string)=>{
        expect(key).toBe(lowest_id.toString());
        lowest_id++;
    })
    },100000);
  });