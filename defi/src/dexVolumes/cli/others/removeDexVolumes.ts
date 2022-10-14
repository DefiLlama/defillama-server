import "./../setup.ts"
import { removeVolume, VolumeType } from "../../data/volume"

(async () => {
    console.log("Removing...")
    const ok = await removeVolume("", VolumeType.dailyVolume)
    const ok2 = await removeVolume("", VolumeType.totalVolume)
    console.log(ok, ok2)
})()
