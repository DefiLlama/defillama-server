import { init, close, getAllUsers, getLastTweet, updateUser, } from './db'
import { transformHandleV2 } from './utils'


async function run() {
  await init()
  const users = await getAllUsers()
  console.log('users: ', users.length)
  let i = 0

  for (let userData of users) {
    i++
    try {
      if (userData.lastTweet?.text) continue;
      const handle = userData.handle
      const lastTweet = await getLastTweet(handle)
      if (!lastTweet) {
        console.log('no tweet found for: ', handle)
        continue;
      }
      userData = transformHandleV2({ handleData: userData, lastTweet, })
      console.log(i, '/', users.length, 'updating user: ', handle, userData.lastTweet)
      await updateUser(userData)
    } catch (e) {
      console.log('error while updating tweets: ', userData.handle)
      console.error(e)
    }
  }
}

run().catch(console.error).then(async () => {
  await close()
  process.exit(0)
})
