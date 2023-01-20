import express, { Response } from "express";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 700, height: 300 });
async function draw(configuration: any) {
  const image = await chartJSNodeCanvas.renderToBuffer(
    configuration,
    `image/png`,
  );
  return image;
}
const PORT = 3000;
const app = express();
type Request = {
  query: { data: string };
};
app.use("/", async (request: Request, response: Response) => {
  try {
    const datasets = JSON.parse(request.query.data).unlocked; // dataset[]
    // dataset: {data: {time, unlock, isCont}[], section }
    const data = datasets[0].data[0].unlocked;
    const labels = datasets[0].data[0].timestamp;
    // response.contentType("json");
    // response.send({
    //   data,
    //   labels,
    //   anno: datasets[0].section,
    //   dataset: datasets[0].data,
    // });
    // return;
    const options = {
      type: "line" as any,
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: "#90ee90",
          },
        ],
      },
      options: {
        scales: {
          x: {
            display: true,
          },
          y: {
            display: true,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
        layout: {
          autoPadding: true,
        },
        elements: {
          point: {
            radius: 0,
          },
          line: { backgroundColor: "#ffffff" },
        },
      },
    };

    const image = await draw(options);
    response.set("Content-Disposition", "inline;");
    response.contentType("image/png");
    response.send(image);
  } catch (e) {
    response.sendStatus(400);
  }
});

app.use(express.urlencoded({ extended: true }));

app.listen(PORT, () => console.log(`Server started on port ${PORT}!`));
// ts-node src/unlocks/utils/server.ts
