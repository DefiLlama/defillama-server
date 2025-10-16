const METADATA_FILE = __dirname + '/metadata.json'
const SAFE_HARBOR_PROJECTS_CACHE_KEY = 'safe-harbor-projects'


const PG_CACHE_KEYS = {
  CACHE_DATA_ALL: 'cache-data-all',
  ORACLES_DATA: 'oracles-data',
  CATEGORIES_DATA: 'categories-data',
  FORKS_DATA: 'forks-data',
  HISTORICAL_TVL_DATA_META: 'getHistoricalTvlForAllProtocols-meta',
}

export {
  METADATA_FILE,
  PG_CACHE_KEYS,
  SAFE_HARBOR_PROJECTS_CACHE_KEY,
}