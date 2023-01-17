import { parseData } from "./test";
import { tornado } from "../protocols/tornado";

async function drawChart(data) {
  data;
  const series = [];
  const chartDom = document.getElementById("main");
  if (chartDom == null) return;
  const myChart = echarts.init(chartDom);
  // const option = {
  //   title: "Hi",
  //   legend: [],
  //   toolbox: { feature: { saveAsImage: {} } },
  //   grid: [],
  //   xAxis: {
  //     type: "value",
  //     data: [],
  //   },
  //   yAxis: {
  //     type: "value",
  //   },
  //   series: [
  //     {
  //       name: "",
  //       type: "line",
  //       stack: "Total",
  //       areaStyle: {},
  //       emphasis: { focus: "series" },
  //       data: [],
  //     },
  //   ],
  // };
  const option = {
    title: {
      text: "ECharts Getting Started Example",
    },
    tooltip: {},
    legend: {
      data: ["sales"],
    },
    xAxis: {
      data: ["Shirts", "Cardigans", "Chiffons", "Pants", "Heels", "Socks"],
    },
    yAxis: {},
    series: [
      {
        name: "sales",
        type: "bar",
        data: [5, 20, 36, 10, 10, 20],
      },
    ],
  };
  option && myChart.setOption(option);
  console.log(
    myChart.getDataURL({
      pixelRatio: 2,
      backgroundColor: "#fff",
    }),
  );
  return;
}
async function main(adapter) {
  const data = await parseData(adapter);
  await drawChart(data);
  return;
}
main(tornado);
