import fs from "fs";
import { resolve } from "path";
import dayjs from "dayjs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 1000, height: 500, backgroundColour: "white" });

const hexColors = {
  green: "#008000",
  blue: "#0000FF",
  cyan: "#00FFFF",
  indigo: "#4B0082",
  gray: "#696969",
  maroon: "#800000",
  purple: "#800080",
};
export async function draw(configuration: any) {
  const image = await chartJSNodeCanvas.renderToBuffer(
    configuration,
    `image/png`,
  );
  return image;
}
function buildOptionsObject(data: any) {
  const labels = data[0].data.timestamps.map((t: number) =>
    stringifyDate(t*1e3, "DD/MM/YYYY"),
  );
  const sections = [...new Set(data.map((d: any) => d.section))];

  const datasets: any[] = data.map((d: any) => ({
    label: d.section,
    data: d.data.unlocked,
    borderColor: Object.values(hexColors)[sections.indexOf(d.section)],
    backgroundColor: Object.values(hexColors)[sections.indexOf(d.section)],
    fill: true,
  }));

  return {
    animation: {
      duration: 750,
    },
    responsive: false,
    type: "line" as any,
    data: {
      labels,
      datasets,
    },
    options: {
      scales: {
        y: {
          stacked: true,
          text: "Supply",
        },
        x: {
          text: "Date",
        },
      },
      layout: {
        autoPadding: true,
      },
      elements: {
        point: {
          radius: 0,
        },
      },
    },
  };
}
export async function getChartPng(data: any[]) {
  const path = resolve(__dirname);
  const options = buildOptionsObject(data);
  const image = await draw(options);
  fs.writeFile(`${path}/result2.png`, image, function (err) {
    if (err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });
}
function stringifyDate(datetime: number, format: string, locale = "en-US") {
  return dayjs(datetime).locale(locale).format(format);
}
