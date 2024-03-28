const { GitCommitRaw, Deleted_GitCommitRaw, sequelize } = require('../../db')
const { Sequelize, Op, } = require('sequelize');

const blacklistedRepos = ['solana-labs/newlib', 'Manta-Network/sparta', 'nutsfinance/ac-mining-report', 'cyberconnecthq/connect-list', 'ethereum/solidity-test-bytecode', 'dappradar/tokens', 'bastionprotocol/circulating-supply', 'Blockstream/asset_registry_testnet_db', 'Blockstream/asset_registry_db', 'Sifchain/airdrop', 'OriginProtocol/origin-dollar-docs' ]
const blacklistedOrgs = ['openssh', 'libtom', 'randombit', 'openssl', 'quicksilver', 'AntelopeIO', 'highfidelity', 'pyca', 'openintents', 'keybase', 'stacks']
const blacklistedAuthors = ['sigma-usd-bot', 'dependabot[bot]', 'Travis CI', 'w3fbot', 'OriginCI', 'Upptime Bot', 'Circle CI', 'Auto import', 'brave-builds', 'Travis CI User', 'exo-swf', 'github-actions[bot]', 'token-list-automerger[bot]', 'dependabot-preview[bot]', 'la-tribu-pusher', 'crawler', 'jenkins-rocket', 'Polkadot Wiki CI', 'paritytech-ci', 'iotasyncbot', 'RV Jenkins', 'CIFuzz', 'RainbowMiner']

async function deleteCommits(condition) {
  // Retrieve commits from the existing table for the current repository
  const commits = await GitCommitRaw.findAll(condition);

  if (!commits.length) return;

  console.log(`Deleting ${commits.length} commits from the existing table`)
  // Insert the retrieved commits into the new table
  await Deleted_GitCommitRaw.bulkCreate(commits.map(i => i.dataValues), {
    ignoreDuplicates: true, // Skip inserting duplicates
  });

  // Delete the commits from the existing table
  const deletedCount = await GitCommitRaw.destroy(condition);

  console.log(`${deletedCount} commits deleted from the existing table`)
}


async function run() {
  await sequelize.sync()
  await deleteCommits({ where: { repo: { [Op.in]: blacklistedRepos }, } });
  await deleteCommits({ where: { owner: { [Op.in]: blacklistedOrgs }, } });
  // await deleteAuthorCommits();
}

async function deleteAuthorCommits() {
  const conditionStr = blacklistedAuthors.map(i => `'${i}'`).join(', ');
  const query = `
      SELECT
        *
      FROM
        git_commit_raw,
        jsonb_array_elements(authors) AS author
      WHERE author->>'name' in (${conditionStr})
    `;

  const commits = await sequelize.query(query, {
    type: Sequelize.QueryTypes.SELECT,
    model: GitCommitRaw, // Optional if you want to map the results to a Sequelize model
  })


  if (!commits.length) return;
  console.log(`Retrieved ${commits.length} commits from the table [blacklisted authors]`)

  // Insert the retrieved commits into the new table
  await Deleted_GitCommitRaw.bulkCreate(commits.map(i => i.dataValues), {
    ignoreDuplicates: true, // Skip inserting duplicates
  });

  const deleteQuery = `
  DELETE FROM git_commit_raw
  WHERE sha IN (
    SELECT DISTINCT ON (sha) sha
    FROM git_commit_raw
    CROSS JOIN LATERAL jsonb_array_elements(authors) AS author
    WHERE author->>'name' IN (${conditionStr})
  )
    `;
  const rowCount = await sequelize.query(deleteQuery, {
    type: Sequelize.QueryTypes.DELETE,
  })

  console.log(`${rowCount} commits deleted from the existing table [blacklisted authors]`)
}

run().catch(console.error).then(async () => {
  await sequelize.close()
  process.exit()
})