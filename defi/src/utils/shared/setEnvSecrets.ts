import dynamodb from './dynamodb'
let envSecretsRes: any

async function setEnvSecrets() {
  try {
    if (!envSecretsRes) envSecretsRes = dynamodb.getEnvSecrets()
    const { Item } = await envSecretsRes
    Object.entries((Item as any)).forEach(([key, value]: any) => {
      if (key !== 'PK' && key !== 'SK') process.env[key] = value
    })
  } catch (e) {
    console.log('Unable to get env secrets: ', e)
  }
}

export default setEnvSecrets;