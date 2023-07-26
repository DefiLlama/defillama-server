import dynamodb from './dynamodb'

async function setEnvSecrets() {
  console.log("env", process.env.OLYMPUS_GRAPH_API_KEY)
  try {
    const { Item } = await dynamodb.getEnvSecrets()
    Object.entries((Item as any)).forEach(([key, value]: any) => {
      if (key !== 'PK' && key !== 'SK') process.env[key] = value
    })
  } catch (e) {
    console.log('Unable to get env secrets: ', e)
  }
  console.log("env2", process.env.OLYMPUS_GRAPH_API_KEY)
}

export default setEnvSecrets;