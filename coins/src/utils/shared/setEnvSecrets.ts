import dynamodb from './dynamodb'
let envSecretsRes: any

// WARNING: This is deprecated, it is no longer used, set the secret in each pod that you use
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