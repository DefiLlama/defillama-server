import tally from '../../../../tally.json' // taken from 'https://www.tally.xyz/api/search-daos'

const tallyData = tally.governances.map((i: any) => ({
  id: i.id, 
  name: i.name,
  kind: i.kind, 
  govs: (i.organization?.governances[0] ?? {}).stats?.proposals?.total ?? 0,
  // govsActive: i.governances.stats.proposals.active,
}))

const t2 = tallyData.filter(i => i.govs > 1)
t2.sort((a, b) => b.govs - a.govs)
console.table(t2)