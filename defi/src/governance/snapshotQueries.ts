
export const graphURL = 'https://hub.snapshot.org/graphql'

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
