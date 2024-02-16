export default [
    {
        protocolId: "182", // lido
        sources: ["https://research.lido.fi/t/lido-dao-core-contributors-provisional-budget/2556"],
        headcount: 83,
        annualUsdCost: {
            OpEx: 8447800,
            salaries: 8366560
        }, // total 16814360
        annualTokenCosts: {
            "coingecko:lido-dao": {
                salaries: 7692199
            }
        },
        notes: ["Budget set in July 2022"],
        lastUpdate: "2023-04-29"
    },
    {
        protocolId: "118", // makerdao
        sources: ["https://expenses.makerdao.network/", "https://expenses.makerdao.network/recognized-delegates/finances/reports?viewMonth=Feb2023"],
        headcount: 97,
        annualUsdCost: {
            others: 12*(76122+51801+3056+17900+1974+195916+49091+21387+14104+33264+7503
                +155208 //deco auditor
                +31738
                ),
            salaries: 12*(398967+127487+27833+67392+193000+42787
                +122873+112946+17389+94548+15208+46550+13200+54337+130785+80074
                ), // using september numbers for data insights
            delegates: 100427*12, // using feb numbers
        }, // extrapolated from feb 2023, the last month with final-ish data as of this writing
        // MKR costs ignored since they are not clear-cut as they are irregularly vested
        notes: ["Based on data from Feb 2023"],
        lastUpdate: "2023-04-29"
    },
    {
        protocolId: "parent#sushi", // sushiswap
        sources: ["https://twitter.com/jaredgrey/status/1602701300520652800"],
        headcount: 15,
        annualUsdCost: {
            freelancers: 294000,
            subscriptions: 475204,
            salaries: 4298000,
            legal: 150e3,
        },
        notes: ["Budget for 2023"],
        lastUpdate: "2023-04-29"
    },
    {
        protocolId: "340", // olympus
        sources: ["https://lookerstudio.google.com/u/0/reporting/cb74b814-7ce1-4449-88e5-eac57637b934/page/ZK0YC"],
        headcount: 31,
        annualUsdCost: {
            salaries: 257507*12,
        },
        notes: ["Using data from March 2023"],
        lastUpdate: "2023-04-29"
    },
    {
        protocolId: "326", // beefy
        sources: ["https://vote.beefy.finance/#/proposal/0x2a7500179f484c265bc027b664b8bffb67132583541c70b89773d949e8a74cc4"],
        headcount: 20,
        annualUsdCost: {
            salaries: 131000*12,
            others: 240220*4,
        },
        lastUpdate: "2023-04-29"
    },
    {
        protocolId: "113", // yearn
        sources: ["https://llamapay.io/yearn"],
        headcount: 25,
        annualUsdCost: {
            salaries: 317535*12,
        },
        annualTokenCosts: {
            "coingecko:yearn-finance": {
                salaries: 26.37719*12
            }
        },
        lastUpdate: "2023-04-29"
    },
    {
        protocolId: "1108", // gearbox
        sources: ["https://gearboxprotocol.notion.site/Monthly-Reports-6849871a9bae44dfb903531c0a997e8f"],
        headcount: 13,
        annualUsdCost: {
            risk: 11e3*12,
            salaries: 63480*12,
        },
        annualTokenCosts: {
            "coingecko:gearbox": {
                salaries: 7864001*12
            }
        },
        lastUpdate: "2023-04-29"
    },
    {
        protocolId: "173", // BadgerDAO
        sources: ["https://lookerstudio.google.com/u/0/reporting/24f03640-4369-4687-a92f-979fe946bb8b/page/UPVxC"],
        headcount: 15,
        annualUsdCost: {
            consulting: 45571*12,
            contractors: 269612*12,
            expenses: 9343*12,
            gas: 18965*12,
            grants: 10954,
            hosting: 11210,
            marketing: 25068,
        },
        notes: ["Using data from Feb 2023"],
        lastUpdate: "2023-04-29"
    },
    {
        protocolId: "parent#inverse-finance", // Inverse Finance
        headcount: 11,
        sources: ["https://www.inverse.finance/transparency/dao"],
        annualUsdCost: {
            salaries: 109070*12,
            audits: 8e3*12, // average
        },
        lastUpdate: "2023-04-29"
    },
    {
        protocolId: "parent#aave",
        sources: ["https://aave.tokenlogic.com.au/aave-runway"],
        annualUsdCost: {
            all: (2.1+4.2+2.2*4+0.9+0.2+0.166*6)*365*1e3,
        },
        annualTokenCosts: {
            "coingecko:aave": {
                salaries: (13.3+0.7+27.6)*365
            }
        },
        lastUpdate: "2023-12-12"
    },
    {
        protocolId: "587", // Maple
        sources: ["https://maple.finance/news/q422-treasuryreport/"],
        annualUsdCost: {
            salaries: 1755446*4,
            legal: 73300*4,
            marketing: 121462*4,
            product: 135626*4,
            operations: 48719*4,
        },
        notes: ["Based on expenses for Q4 '22, one-off expenses such as one acquisition were ignored"],
        lastUpdate: "2023-05-01"
    },
    {
        protocolId: "2618", // OasisSwap
        sources: ["https://docs.google.com/spreadsheets/d/1lWlQavTbbKcyuaES3wOV9lvfba00XiNrHybZIyhNDYA/htmlview#gid=83043161"],
        annualUsdCost: {
            salaries: 707000,
        },
        lastUpdate: "2023-05-06"
    },
    {
        protocolId: "1933", // Timeless
        sources: ["https://gov.timelessfi.com/discussion/10011-trc-00302-fund-the-12-month-operational-cost-of-the-timeless-engineering-unit"],
        annualUsdCost: {
            salaries: 835e3,
            reimbursement: 185e3,
            legal: 85e3,
            gasCosts: 50e3
        },
        lastUpdate: "2023-05-06"
    },
    {
        protocolId: "parent#sphere", // 
        sources: ["https://www.sphere.finance/treasury-report"],
        //headcount: 12, not sure, confirm this
        annualUsdCost: {
            staffPayroll: 319610,
            operationalCosts: 43000,
            subscriptionsServices: 600,
            additionalMarketing: 49795,
            ylSPHEREDispersments: 134331
        },
        notes: ["Using data from Q3 2023"],
        lastUpdate: "2023-12-19"
    },
    {
        protocolId: "parent#marinade-finance", // 
        sources: null,
        headcount: 8,
        annualUsdCost: {
            salaries: 820000,
            operationalCosts: 14000,
        },
        notes: ["Using data from Q1 2024"],
        lastUpdate: "2024-2-16"
    },
]