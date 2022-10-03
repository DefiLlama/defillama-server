import "./../setup.ts"
import { removeVolume, VolumeType } from "../../data/volume"

(async () => {
    console.log("Removing...")
    const ok = await removeVolume("491", VolumeType.dailyVolume)
    console.log(ok)
})()
