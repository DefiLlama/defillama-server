
export const graphURL = 'https://hub.snapshot.org/graphql'
export const graphURLTally = 'https://api.tally.xyz/query'

export const metadataQuery = `query Spaces($ids: [String]!) {
  spaces(first: 1000, skip: 0, orderBy: "created", orderDirection: desc, where: {id_in: $ids}) {
    id
    name
    about
    network
    symbol
    strategies {
      name
      network
      params
    }
    admins
    moderators
    members
    filters {
      minScore
      onlyMembers
    }
    private
    location
    avatar
    terms
    twitter
    github
    coingecko
    email
    plugins
    domain
    validation {
      name
      params
    }
    voteValidation {
      name
    }
    followersCount
    proposalsCount
    parent { id}
    children { id }
    treasuries { name address network }
  }
}`

export const allSpaceQuery = `query Spaces($skip: Int!) {
  spaces(
    first: 1000,
    skip: $skip,
    orderBy: "created",
    orderDirection: desc,
  ) {
    id
    name
    coingecko
  }
}`

export const proposalQuery = `query Proposals($ids: [String]!, $skip: Int!, $startFrom:  Int) {
  proposals(first: 1000, skip: $skip, where: { space_in: $ids end_gt: $startFrom }, orderBy: "created", orderDirection: desc) {
    id
    title
    choices
    start
    end
    snapshot
    state
    author
    network
    author
    space {
      id
    }
    quorum
    privacy
    link
    app
    scores
    # scores_state
    scores_total
    scores_updated
    # scores_by_strategy
    discussion
    # body
    votes
  }
}`


export const metadataQueryTally = `query Governers($ids: [AccountID!]) {
  governors(
    ids: $ids
    includeInactive: false
    sort: {field: TOTAL_PROPOSALS, order: DESC}
    pagination: {limit: 999}
  ) {
    id
    type
    tokens {
      id
      type
      name
      symbol
      supply
      decimals
    }
    proposalStats {
      total
      active
      failed
      passed
    }
    parameters {
      __typename
    }
    quorum
    name
    slug
    __typename
  }
}`

export const proposalQueryTally = `query Proposals($ids: [Address!], $chain: ChainID!, $skip: Int, $limit: Int) {
  proposals(
    governors: $ids
    sort: {field: END_BLOCK, order: DESC}
    pagination: {limit: $limit, offset: $skip}
    chainId: $chain
  ) {
    id
    title
    description
    eta
    block {
      id
      number
      timestamp
    }
    governanceId
    voteStats {
      support
      weight
      votes
      percent
    }
    statusChanges {
      type
      blockNumber
      blockTimestamp
      block {
        id
        number
        timestamp
      }
      txHash
    }
  }
}`