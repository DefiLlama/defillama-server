import dynamodb from './dynamodb'

async function setEnvSecrets() {
  try {
    const { Item } = await dynamodb.getEnvSecrets()
    Object.entries((Item as any)).forEach(([key, value]: any) => {
      if (key !== 'PK' && key !== 'SK') process.env[key] = value
    })
  } catch (e) {
    console.log('Unable to get env secrets: ', e)
  }
}

export default setEnvSecrets;