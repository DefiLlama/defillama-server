import { getChainDisplayName, addToChains, isDoubleCounted } from './normalizeChain'

const tests = [
    ["gochain", "GoChain"],
    ["ethereum", "Ethereum"],
    ["ethereum-staking", "Ethereum-staking"],
    ["hpb-borrowed", "HPB-borrowed"],
    ["staking", "staking"]
]

test("getChainDisplayName", () => {
    tests.forEach(t => expect(getChainDisplayName(t[0], false)).toBe(t[1]))
})

test("getChainDisplayName useNewChainNames", () => {
    expect(getChainDisplayName("bsc", false)).toBe("Binance")
    expect(getChainDisplayName("bsc", true)).toBe("BSC")
})

test("addToChains", () => {
    const chains = [] as string[]
    addToChains(chains, "Ethereum")
    expect(chains).toEqual(["Ethereum"])
    addToChains(chains, "Ethereum-borrowed")
    expect(chains).toEqual(["Ethereum"])
    addToChains(chains, "BSC-staking")
    expect(chains).toEqual(["Ethereum", "BSC"])
    addToChains(chains, "Heco")
    expect(chains).toEqual(["Ethereum", "BSC", "Heco"])
})

test("isDoubleCounted", () => {
    expect(isDoubleCounted(true)).toBe(true)
    expect(isDoubleCounted(false)).toBe(false)
    expect(isDoubleCounted(false, 'yield')).toBe(true)
    expect(isDoubleCounted(false, 'Yield')).toBe(true)
    expect(isDoubleCounted(false, 'Restaked BTC')).toBe(true)
    expect(isDoubleCounted(false, 'Restaked  BTC')).toBe(false)
    expect(isDoubleCounted(true, 'non-existant')).toBe(true)
    expect(isDoubleCounted(true, 1236456 as any)).toBe(true)
    expect(isDoubleCounted(false, 1236456 as any)).toBe(false)
    expect(isDoubleCounted(false, 'Treasury Manager')).toBe(true)
    expect(isDoubleCounted(true, 'Treasury Manager')).toBe(true)
})