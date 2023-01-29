import getProtocol from "../defiCode/getProtocol"
import express from 'express'

const app = express()
const port = 3000

app.get('/protocol/:protocol', async (req, res) => {
    const protocol = req.params.protocol
    const response = await getProtocol({
        pathParameters: {
            protocol
        }
    })
    if (typeof response !== "object") {
        res.sendStatus(500);
        return
    }
    res.set(response.headers)
    res.send(response.body)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})