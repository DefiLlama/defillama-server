import axios from 'axios'

const client = axios.create({
  baseURL: process.env.RPC_PROXY_URL,
  timeout: 30000,
})

export default {
  kamino: {
    reserves: async (market) => {
      const { data } = await client.get('/kamino/lend/'+market)
      return data
    },
  },
  fuel: {
    query: async ({ contractId, abi, method, params = [] }) => {
      const { data } = await client.post('/fuel/query', { contractId, abi, method, params})
      return data
    }
  },
}